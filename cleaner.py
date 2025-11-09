import pandas as pd
import re
from bs4 import BeautifulSoup
from pymystem3 import Mystem
from razdel import tokenize
from nltk.corpus import stopwords
import nltk
import re

# Загружаем стоп-слова для русского языка
nltk.download('stopwords')
stop_words = set(stopwords.words('russian'))

# Инициализируем лемматизатор
mystem = Mystem()

def clean_text(text):
    
    if not isinstance(text, str) or not text.strip():
        return None  # Пропускаем пустые строки

    # Удаляем HTML-теги
    text = BeautifulSoup(text, "html.parser").get_text()

    # Заменяем ":" на ": "
    text = re.sub(r':([^\s])', r': \1', text)

    # Приводим текст к нижнему регистру
    text = text.lower()

    # Удаляем знаки препинания и смайлы
    text = re.sub(r'[^\w\s]', '', text)

    # # Токенизация и лемматизация
    # tokens = [token.text for token in tokenize(text)]
    # lemmas = mystem.lemmatize(' '.join(tokens))

    # # Удаляем стоп-слова
    # cleaned_lemmas = [lemma.strip() for lemma in lemmas if lemma.strip() and lemma not in stop_words]

    return text

# Загружаем CSV-файл
df = pd.read_csv('wb_rewievs.csv')  # Замените 'your_file.csv' на путь к вашему файлу
 
# Применяем функцию очистки к каждой строке
#df['cleaned_review'] = df['review_text'].apply(clean_text)  # Замените 'review_column' на название столбца с отзывами
#print(df['review_text'].apply(clean_text))

# список для результатов
cleaned = []

# перебор каждой строки из review_text
for value in df['review_text']:
    result = clean_text(value)   
    cleaned.append(result)       # добавляем в список
print(cleaned)
# теперь cleaned — это список, который можно использовать дальше

# # Удаляем дубликаты и пустые строки
# df = df.dropna(subset=['cleaned_review'])
# df = df.drop_duplicates(subset=['cleaned_review'])

# Сохраняем результат
df = pd.DataFrame(cleaned, columns=['cleaned_review'])
df.to_csv('wb_rewievs_clean.csv', index=False)
