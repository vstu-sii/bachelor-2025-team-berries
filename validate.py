import json
import pandas as pd
from collections import Counter

def load_json_data(json_path: str) -> pd.DataFrame:
    """
    Загружает данные из JSON файла и преобразует в DataFrame
    """
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Преобразуем в DataFrame
    records = []
    for item in data:
        # Объединяем все текстовые поля в один текст отзыва
        text_parts = []
        
        # Обрабатываем плюсы (может быть списком строк)
        if item.get('плюсы'):
            for plus in item['плюсы']:
                if isinstance(plus, str) and plus.strip():
                    text_parts.append(plus)
        
        # Обрабатываем недостатки
        if item.get('недостатки'):
            for minus in item['недостатки']:
                if isinstance(minus, str) and minus.strip():
                    text_parts.append(minus)
        
        # Обрабатываем комментарии
        if item.get('комментарий'):
            for comment in item['комментарий']:
                if isinstance(comment, str) and comment.strip():
                    text_parts.append(comment)
        
        # Объединяем все части в один текст
        full_text = ' '.join(text_parts) if text_parts else ''
        
        # Определяем метку (label) на основе наличия плюсов/минусов
        has_pluses = bool(item.get('плюсы') and any(isinstance(p, str) and p.strip() for p in item['плюсы']))
        has_minuses = bool(item.get('недостатки') and any(isinstance(m, str) and m.strip() for m in item['недостатки']))
        
        if has_pluses and not has_minuses:
            label = 'positive'
        elif has_minuses and not has_pluses:
            label = 'negative'
        elif has_pluses and has_minuses:
            label = 'mixed'
        else:
            label = 'neutral'
        
        records.append({
            'text': full_text,
            'label': label,
            'original_data': item  # Сохраняем оригинальную структуру
        })
    
    return pd.DataFrame(records)

def validate_and_check_quality(json_path: str) -> dict:
    """
    Выполняет проверку качества данных из JSON файла:
    - Пустые отзывы
    - Дубликаты
    - Баланс классов
    Возвращает статистику в виде словаря.
    """
    # Загрузка данных из JSON
    df = load_json_data(json_path)

    # Инициализация результатов
    stats = {
        "total_reviews": len(df),
        "empty_reviews": 0,
        "duplicate_reviews": 0,
        "class_distribution": {},
        "sample_empty_reviews": [],
        "sample_duplicate_reviews": [],
        "text_length_stats": {},
        "original_structure_stats": {}
    }

    # 1. Проверка пустых отзывов
    empty_mask = df["text"].str.strip().eq("")
    stats["empty_reviews"] = empty_mask.sum()
    stats["sample_empty_reviews"] = df[empty_mask]["text"].tolist()[:5]

    # 2. Проверка дубликатов
    duplicate_mask = df.duplicated(subset=["text"], keep=False)
    stats["duplicate_reviews"] = duplicate_mask.sum()
    stats["sample_duplicate_reviews"] = df[duplicate_mask]["text"].unique()[:5]

    # 3. Баланс классов
    class_counts = Counter(df["label"])
    stats["class_distribution"] = dict(class_counts)

    # 4. Статистика длины текста
    text_lengths = df["text"].str.len()
    stats["text_length_stats"] = {
        "min_length": int(text_lengths.min()),
        "max_length": int(text_lengths.max()),
        "mean_length": float(text_lengths.mean()),
        "median_length": float(text_lengths.median())
    }

    # 5. Статистика по оригинальной структуре
    with open(json_path, 'r', encoding='utf-8') as f:
        original_data = json.load(f)
    
    structure_stats = {
        "total_items": len(original_data),
        "items_with_pluses": sum(1 for item in original_data if item.get('плюсы')),
        "items_with_minuses": sum(1 for item in original_data if item.get('недостатки')),
        "items_with_comments": sum(1 for item in original_data if item.get('комментарий')),
        "completely_empty_items": sum(1 for item in original_data if not any([
            item.get('плюсы'), 
            item.get('недостатки'), 
            item.get('комментарий')
        ]))
    }
    stats["original_structure_stats"] = structure_stats

    return stats

def print_statistics(stats: dict) -> None:
    """Выводит отчёт по статистике датасета."""
    print("=== СТАТИСТИКА ДАТАСЕТА ===")
    print(f"Всего отзывов: {stats['total_reviews']}")
    print(f"Пустые отзывы: {stats['empty_reviews']} ({stats['empty_reviews'] / stats['total_reviews'] * 100:.2f}%)")
    print(f"Дубликаты: {stats['duplicate_reviews']} ({stats['duplicate_reviews'] / stats['total_reviews'] * 100:.2f}%)")
    
    print("\n=== БАЛАНС КЛАССОВ ===")
    for class_label, count in stats["class_distribution"].items():
        print(f"  {class_label}: {count} ({count / stats['total_reviews'] * 100:.2f}%)")
    
    print("\n=== СТАТИСТИКА ДЛИНЫ ТЕКСТА ===")
    length_stats = stats["text_length_stats"]
    print(f"  Минимальная длина: {length_stats['min_length']} символов")
    print(f"  Максимальная длина: {length_stats['max_length']} символов")
    print(f"  Средняя длина: {length_stats['mean_length']:.1f} символов")
    print(f"  Медианная длина: {length_stats['median_length']:.1f} символов")
    
    print("\n=== СТАТИСТИКА ОРИГИНАЛЬНОЙ СТРУКТУРЫ ===")
    struct_stats = stats["original_structure_stats"]
    print(f"  Всего элементов: {struct_stats['total_items']}")
    print(f"  С плюсами: {struct_stats['items_with_pluses']} ({struct_stats['items_with_pluses']/struct_stats['total_items']*100:.1f}%)")
    print(f"  С недостатками: {struct_stats['items_with_minuses']} ({struct_stats['items_with_minuses']/struct_stats['total_items']*100:.1f}%)")
    print(f"  С комментариями: {struct_stats['items_with_comments']} ({struct_stats['items_with_comments']/struct_stats['total_items']*100:.1f}%)")
    print(f"  Полностью пустые: {struct_stats['completely_empty_items']} ({struct_stats['completely_empty_items']/struct_stats['total_items']*100:.1f}%)")

    if stats["sample_empty_reviews"]:
        print(f"\nПримеры пустых отзывов ({len(stats['sample_empty_reviews'])}):")
        for i, example in enumerate(stats["sample_empty_reviews"][:3], 1):
            print(f"  {i}. '{example}'")
    
    if stats["sample_duplicate_reviews"]:
        print(f"\nПримеры дубликатов ({len(stats['sample_duplicate_reviews'])}):")
        for i, example in enumerate(stats["sample_duplicate_reviews"][:3], 1):
            print(f"  {i}. '{example[:100]}...'")

def save_cleaned_data(json_path: str, output_path: str) -> pd.DataFrame:
    """
    Сохраняет очищенные данные (без дубликатов и пустых отзывов) в новый JSON файл
    """
    df = load_json_data(json_path)
    
    # Удаляем пустые отзывы и дубликаты
    cleaned_df = df[df["text"].str.strip().ne("")].drop_duplicates(subset=["text"])
    
    # Сохраняем в JSON
    cleaned_data = cleaned_df.to_dict('records')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
    
    print(f"\nОчищенные данные сохранены в: {output_path}")
    print(f"Исходный размер: {len(df)}, после очистки: {len(cleaned_df)}")
    
    return cleaned_df

# Пример использования
if __name__ == "__main__":
    # Укажите путь к вашему JSON файлу
    json_path = "wb_rewievs_formatted.json"
    
    try:
        # Проверка качества данных
        print("Загрузка и анализ данных...")
        stats = validate_and_check_quality(json_path)
        print_statistics(stats)
        
        # Сохранение очищенных данных (опционально)
        save_cleaned = input("\nСохранить очищенные данные? (y/n): ").lower().strip()
        if save_cleaned == 'y':
            output_path = json_path.replace('.json', '_cleaned.json')
            cleaned_df = save_cleaned_data(json_path, output_path)
            
    except FileNotFoundError:
        print(f"Файл {json_path} не найден!")
    except json.JSONDecodeError:
        print(f"Ошибка чтения JSON файла {json_path}!")
    except Exception as e:
        print(f"Произошла ошибка: {e}")