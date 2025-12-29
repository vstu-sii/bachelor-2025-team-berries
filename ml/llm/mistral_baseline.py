import os
import re
import pandas as pd
import json
import uuid
from datetime import datetime
from tqdm import tqdm
from dotenv import load_dotenv
from langfuse import observe, get_client
from mistralai import Mistral
from .prompt_templates import negative_reviews_insight_prompt, secure_prompt_scaffold


load_dotenv()

langfuse = get_client()
mistral_client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])


@observe(as_type="generation")
def mistral_completion(**kwargs): # обёртка для вызова Mistral с логированием в Langfuse
    # Clone kwargs to avoid modifying the original input
    kwargs_clone = kwargs.copy()

    # Extract relevant parameters from kwargs
    input = kwargs_clone.pop('messages', None)
    model = kwargs_clone.pop('model', None)
    min_tokens = kwargs_clone.pop('min_tokens', None)
    max_tokens = kwargs_clone.pop('max_tokens', None)
    temperature = kwargs_clone.pop('temperature', None)
    top_p = kwargs_clone.pop('top_p', None)

    # Filter and prepare model parameters for logging
    model_parameters = {
        "maxTokens": max_tokens,
        "minTokens": min_tokens,
        "temperature": temperature,
        "top_p": top_p
    }
    model_parameters = {k: v for k,
                        v in model_parameters.items() if v is not None}

    # Log the input and model parameters before calling the LLM
    langfuse.update_current_generation(
        input=input,
        model=model,
        model_parameters=model_parameters,
        metadata=kwargs_clone,

    )

    # Call the Mistral model to generate a response
    res = mistral_client.chat.complete(**kwargs)

    # Log the usage details and output content after the LLM call
    langfuse.update_current_generation(
        usage_details={
            "input": res.usage.prompt_tokens,
            "output": res.usage.completion_tokens
        },
        output=res.choices[0].message.content
    )

    # Return the model's response object
    return res


@observe()
def generate_negative_reviews_summary(negative_reviews): # генерирует сводку по негативным отзывам

    # Сформируем текст для промпта — каждый отзыв на новой строке
    reviews_text = "\n".join(negative_reviews)
    prompt = negative_reviews_insight_prompt(reviews_text)

    response = mistral_completion(
        model="mistral-small-latest",
        max_tokens=1024,
        temperature=0.4,
        messages=[
            {
              "content": prompt,
              "role": "user",
            },
        ]
    )
    return response.choices[0].message.content


@observe()
def analyze_reviews(reviews: list, batch_size: int, output_json_path: str): # анализирует отзывы по батчам и сохраняет результаты в JSON-файл
    results = [] 

    for chunk in tqdm(list(batch(reviews, batch_size))):

        reviews_text = "\n".join([f'- "{r}"' for r in chunk])

        prompt = secure_prompt_scaffold(reviews_text)

        response = mistral_completion(
            model="mistral-small-latest",
            # max_tokens=1024,
            # temperature=0.4,
            messages=[
                {
                "content": prompt,
                "role": "user",
                },
            ]
        )
        raw = response.choices[0].message.content 

        try:
            parsed = extract_json(raw)
            if isinstance(parsed, dict):
                parsed = [parsed]  # если модель вернула один объект
            results.extend(parsed)
        except json.JSONDecodeError:
            print("\n НЕ УДАЛОСЬ РАСПАРСИТЬ JSON, ответ модели:")
            print(raw)
            continue

    # Сохраним результаты текущего батча в JSON-файл
    save_json(results, output_json_path)


def find_negative_reviews_json(json_path): # находит и возвращает список негативных отзывов из JSON-файла с результатами анализа

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    negative_reviews = [item.get("review", "")
                        for item in data if item.get("tone") == "негативная"]

    return negative_reviews


def extract_json(text: str): # Достаёт JSON даже если модель добавила текст, markdown или комментарии.
    # ищем JSON-массив
    match_array = re.search(r'\[\s*{.*}\s*\]', text, re.DOTALL)
    if match_array:
        return json.loads(match_array.group())

    # ищем JSON-объект
    match_object = re.search(r'{.*}', text, re.DOTALL)
    if match_object:
        return json.loads(match_object.group())

    raise json.JSONDecodeError("Не найден JSON", text, 0)


def batch(lst, n): # разбивает список lst на подсписки по n элементов
    for i in range(0, len(lst), n):
        yield lst[i:i+n]


def save_to_text(content): # сохраняет список элементов в уникально именованный текстовый файл в корне проекта
    if not isinstance(content, (list, tuple)):
        raise TypeError("content must be a list or tuple of items to save")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    filename = f"saved_{timestamp}_{unique_id}.txt"
    file_path = os.path.join(os.getcwd(), filename)

    with open(file_path, "w", encoding="utf-8") as f:
        for item in content:
            f.write(str(item) + "\n")

    return file_path


def load_csv(csv_path: str, column_name: str) -> list: # загружает данные из CSV-файла и возвращает список значений указанной колонки
    df = pd.read_csv(csv_path)
    reviews = df[column_name].astype(str).tolist()
    return reviews


def save_json(data, json_path: str): # сохраняет данные в JSON-файл
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def process_csv_and_analyze(csv_path: str, csv_column: str = "review_text", batch_size: int = 20) -> str:
    """Load reviews from `csv_path`, analyze them in batches and save analysis JSON to
    `data/analysed/<csv_basename>_analysed.json`. Then generate and return the
    negative reviews summary using `generate_negative_reviews_summary`.

    Returns the summary string produced by `generate_negative_reviews_summary`.
    """
    # ensure output directory exists
    analysed_dir = os.path.join(os.getcwd(), "data", "analysed")
    os.makedirs(analysed_dir, exist_ok=True)

    # derive json filename from csv filename
    base_name = os.path.splitext(os.path.basename(csv_path))[0]
    json_filename = f"{base_name}_analysed.json"
    json_path = os.path.join(analysed_dir, json_filename)

    # load, analyze and save JSON
    raw_reviews = load_csv(csv_path, csv_column)
    analyze_reviews(raw_reviews, batch_size, json_path)

    # find negative reviews and generate summary
    negative_reviews = find_negative_reviews_json(json_path)
    summary = generate_negative_reviews_summary(negative_reviews)

    return summary