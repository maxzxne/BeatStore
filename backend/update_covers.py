#!/usr/bin/env python3
import os
import sys
sys.path.append('backend')

from database import SessionLocal
from models import Beat

def update_covers():
    db = SessionLocal()
    
    try:
        # Проверяем существующие обложки
        covers_dir = 'static/covers'
        if os.path.exists(covers_dir):
            cover_files = [f for f in os.listdir(covers_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif'))]
            print(f'Найдено обложек: {len(cover_files)}')
            
            for cover in cover_files:
                print(f'  - {cover}')
                
                # Извлекаем ID из имени файла
                if cover.startswith('cover_'):
                    try:
                        beat_id = int(cover.split('_')[1])
                        beat = db.query(Beat).filter(Beat.id == beat_id).first()
                        if beat:
                            beat.cover_url = f'/static/covers/{cover}'
                            print(f'    Обновлен бит ID {beat_id}: {beat.title}')
                        else:
                            print(f'    Бит с ID {beat_id} не найден')
                    except (ValueError, IndexError):
                        print(f'    Не удалось извлечь ID из {cover}')
        else:
            print('Папка backend/static/covers не найдена')
        
        db.commit()
        print('Обновление завершено')
        
    except Exception as e:
        print(f'Ошибка: {e}')
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    update_covers()
