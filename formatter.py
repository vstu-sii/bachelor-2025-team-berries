import pandas as pd
import json

def parse_review(text):
    parts = {
        'плюсы': [],
        'недостатки': [],
        'комментарий': [],
        'нейтральные_фразы': []
    }
    text = ' '.join(text.split())

    # Извлечение плюсов
    if 'плюсы товара' in text:
        plus_start = text.find('плюсы товара') + len('плюсы товара')
        plus_end = text.find('недостатки', plus_start)
        if plus_end == -1:
            plus_end = text.find('достоинства', plus_start)
            if plus_end == -1:
                plus_end = text.find('комментарий', plus_start)
                if plus_end == -1:
                    plus_end = len(text)
        plus_text = text[plus_start:plus_end].strip()
        parts['плюсы'] = [p.strip() for p in plus_text.split(',') if p.strip()]

    # Извлечение недостатков
    if 'недостатки' in text:
        minus_start = text.find('недостатки') + len('недостатки')
        minus_end = text.find('достоинства', minus_start)
        if minus_end == -1:
            minus_end = text.find('комментарий', minus_start)
            if minus_end == -1:
                minus_end = len(text)
        minus_text = text[minus_start:minus_end].strip()
        parts['недостатки'] = [m.strip() for m in minus_text.split(',') if m.strip()]

    # Извлечение достоинств
    if 'достоинства' in text:
        pros_start = text.find('достоинства') + len('достоинства')
        pros_end = text.find('недостатки', pros_start)
        if pros_end == -1:
            pros_end = text.find('комментарий', pros_start)
            if pros_end == -1:
                pros_end = len(text)
        pros_text = text[pros_start:pros_end].strip()
        parts['плюсы'].extend([p.strip() for p in pros_text.split(',') if p.strip()])

    # Извлечение комментариев
    if 'комментарий' in text:
        comment_start = text.find('комментарий') + len('комментарий')
        comment_text = text[comment_start:].strip()
        parts['комментарий'] = [c.strip() for c in comment_text.split(',') if c.strip()]

    # Убираем дубликаты
    parts['плюсы'] = list(set(parts['плюсы']))
    parts['недостатки'] = list(set(parts['недостатки']))

    return parts

# Загрузка CSV-файла
df = pd.read_csv('wb_rewievs_clean.csv')

# Разметка строк
parsed_data = df['cleaned_review'].apply(parse_review).tolist()

# Сохранение в JSON
with open('wb_rewievs_formatted.json', 'w', encoding='utf-8') as f:
    json.dump(parsed_data, f, ensure_ascii=False, indent=4)
