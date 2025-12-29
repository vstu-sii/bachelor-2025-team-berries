import os
import re
import time
import random
from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pandas as pd

def extract_product_id(review_link: str) -> str:
    match = re.search(r'/catalog/(\d+)/', review_link)
    if match:
        return match.group(1)
    else:
        raise ValueError("Не удалось извлечь идентификатор товара из ссылки.")

def generate_save_path(review_link: str) -> str:
    product_id = extract_product_id(review_link)
    file_name = f"reviews_{product_id}.csv"
    save_dir = os.path.join(os.getcwd(), "data\\raw")
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, file_name)
    return save_path

def scroll_and_collect_reviews(driver):
    reviews = set()
    last_height = driver.execute_script("return document.body.scrollHeight")
    attempts = 0
    max_no_new_reviews = 2  # Останавливаемся, если 2 раза подряд не появилось новых отзывов
    no_new_reviews_count = 0

    while no_new_reviews_count < max_no_new_reviews:
        # Скроллим до конца страницы
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        # Случайная задержка для имитации пользователя
        time.sleep(random.uniform(1.5, 3.0))

        # Собираем все отзывы после каждого скролла
        review_elements = driver.find_elements(By.CSS_SELECTOR, "div.feedback__content")
        current_reviews_count = len(reviews)
        for review in review_elements:
            try:
                full_text = review.text
                cleaned_text = " ".join(full_text.split())
                if cleaned_text and cleaned_text not in reviews:
                    reviews.add(cleaned_text)
            except Exception as e:
                print(f"Ошибка при обработке отзыва: {e}")
                continue

        # Проверяем, появились ли новые отзывы
        if len(reviews) == current_reviews_count:
            no_new_reviews_count += 1
        else:
            no_new_reviews_count = 0

        # Вычисляем новую высоту страницы
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            no_new_reviews_count += 1

        last_height = new_height
        attempts += 1
        print(f"Скролл: попытка {attempts}, собрано отзывов: {len(reviews)}")

    return reviews

def parse_wb(review_link: str, driver, save_path: str):
    try:
        driver.get(review_link)
        # Ждём появления первого отзыва
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.feedback__content"))
        )
        # Собираем отзывы во время скролла
        reviews = scroll_and_collect_reviews(driver)
        print(f"Собрано уникальных отзывов: {len(reviews)}")
        # Сохраняем отзывы в CSV
        df = pd.DataFrame(list(reviews), columns=["review_text"])
        df.to_csv(save_path, index=False)
        print(f"Отзывы сохранены в {save_path}")
    finally:
        try:
            driver.quit()
        except Exception as e:
            print(f"Ошибка при закрытии драйвера: {e}. Браузер уже закрыт.")


def run_wb_parser(review_link: str) -> str:
    chrome_options = Options()
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    save_path = generate_save_path(review_link)

    try:
        parse_wb(review_link, driver, save_path)
        return save_path
    except Exception as e:
        raise RuntimeError(f"Ошибка парсинга: {e}")