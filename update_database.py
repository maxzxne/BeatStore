#!/usr/bin/env python3
"""
Скрипт для обновления базы данных BeatStore
Добавляет недостающие колонки в таблицу beats
"""

import sqlite3
import os

def update_database():
    """Обновляет структуру базы данных"""
    db_path = "backend/beatstore.db"
    
    if not os.path.exists(db_path):
        print(f"База данных {db_path} не найдена")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Проверяем существующие колонки
        cursor.execute("PRAGMA table_info(beats)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Существующие колонки: {columns}")
        
        # Добавляем недостающие колонки
        new_columns = [
            ("artist", "VARCHAR DEFAULT 'Producer'"),
            ("key", "VARCHAR"),
            ("description", "TEXT"),
            ("full_audio_url", "VARCHAR"),
            ("project_files_url", "VARCHAR"),
            ("cover_url", "VARCHAR"),
            ("is_available", "BOOLEAN DEFAULT 1"),
            ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP")
        ]
        
        for col_name, col_type in new_columns:
            if col_name not in columns:
                print(f"Добавляем колонку: {col_name}")
                cursor.execute(f"ALTER TABLE beats ADD COLUMN {col_name} {col_type}")
            else:
                print(f"Колонка {col_name} уже существует")
        
        # Обновляем существующие записи с правильными URL
        cursor.execute("SELECT id, title FROM beats")
        beats = cursor.fetchall()
        
        for beat_id, title in beats:
            # Обновляем demo_url если он пустой
            cursor.execute("SELECT demo_url FROM beats WHERE id = ?", (beat_id,))
            demo_url = cursor.fetchone()[0]
            
            if not demo_url:
                # Ищем соответствующий файл
                demo_files = [f for f in os.listdir("backend/static/demos") if f.startswith(f"demo_{beat_id}_")]
                if demo_files:
                    demo_url = f"/static/demos/{demo_files[0]}"
                    cursor.execute("UPDATE beats SET demo_url = ? WHERE id = ?", (demo_url, beat_id))
                    print(f"Обновлен demo_url для бита {beat_id}: {demo_url}")
            
            # Обновляем full_audio_url если он пустой
            cursor.execute("SELECT full_audio_url FROM beats WHERE id = ?", (beat_id,))
            full_url = cursor.fetchone()[0]
            
            if not full_url:
                # Ищем соответствующий файл
                audio_files = [f for f in os.listdir("backend/static/audio") if f.startswith(f"full_{beat_id}_")]
                if audio_files:
                    full_url = f"/static/audio/{audio_files[0]}"
                    cursor.execute("UPDATE beats SET full_audio_url = ? WHERE id = ?", (full_url, beat_id))
                    print(f"Обновлен full_audio_url для бита {beat_id}: {full_url}")
            
            # Обновляем cover_url если он пустой
            cursor.execute("SELECT cover_url FROM beats WHERE id = ?", (beat_id,))
            cover_url = cursor.fetchone()[0]
            
            if not cover_url:
                # Ищем соответствующий файл
                cover_files = [f for f in os.listdir("backend/static/covers") if f.startswith(f"cover_{beat_id}_")]
                if cover_files:
                    cover_url = f"/static/covers/{cover_files[0]}"
                    cursor.execute("UPDATE beats SET cover_url = ? WHERE id = ?", (cover_url, beat_id))
                    print(f"Обновлен cover_url для бита {beat_id}: {cover_url}")
        
        conn.commit()
        print("База данных успешно обновлена!")
        
    except Exception as e:
        print(f"Ошибка при обновлении базы данных: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    update_database()
