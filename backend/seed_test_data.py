"""
Скрипт для заполнения базы данных тестовыми данными
Запускается автоматически при деплое, если данных нет
"""

import os
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Beat, Course, User, ServiceOrder, Purchase, CoursePurchase
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def seed_test_data():
    """Заполняет базу данных тестовыми битами, курсами и заявками"""
    db = SessionLocal()
    
    try:
        # Проверяем, есть ли уже данные
        existing_beats = db.query(Beat).count()
        existing_courses = db.query(Course).count()
        
        # Обновляем существующие биты - делаем биты с "(одноразовый)" в названии одноразовыми
        # Также обновляем биты Test Beat 4, 5, 6 если они еще не обновлены
        if existing_beats > 0:
            print("🔄 Обновление существующих битов...")
            all_beats = sorted(db.query(Beat).all(), key=lambda b: b.id)  # Сортируем по ID
            updated_count = 0
            for i, beat in enumerate(all_beats, 1):
                # Обновляем биты с "(одноразовый)" в названии
                if "(одноразовый)" in beat.title and beat.allow_multiple_purchases:
                    beat.allow_multiple_purchases = False
                    updated_count += 1
                    print(f"✅ Обновлен бит: {beat.title} - теперь одноразовый")
                # Также обновляем биты Test Beat 4, 5, 6 если они еще не имеют "(одноразовый)" в названии
                elif beat.title.startswith("Test Beat") and i >= 4 and i <= 6:
                    if beat.allow_multiple_purchases:
                        beat.allow_multiple_purchases = False
                        if "(одноразовый)" not in beat.title:
                            beat.title = beat.title + " (одноразовый)"
                        updated_count += 1
                        print(f"✅ Обновлен бит: {beat.title} - теперь одноразовый")
            if updated_count > 0:
                db.commit()
                print(f"✅ Обновлено {updated_count} битов")
        
        if existing_beats > 0 or existing_courses > 0:
            print("📦 Тестовые данные уже существуют, пропускаем заполнение")
            return
        
        print("🌱 Начинаем заполнение тестовыми данными...")
        
        # Получаем список существующих файлов из static
        demos_dir = "static/demos"
        audio_dir = "static/audio"
        covers_dir = "static/covers"
        previews_dir = "static/course_previews"
        videos_dir = "static/course_videos"
        test_files_dir = "static/test_files"
        
        demo_files = sorted([f for f in os.listdir(demos_dir) if f.endswith('.mp3')]) if os.path.exists(demos_dir) else []
        audio_files = sorted([f for f in os.listdir(audio_dir) if f.endswith('.mp3')]) if os.path.exists(audio_dir) else []
        cover_files = sorted([f for f in os.listdir(covers_dir) if any(f.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.webp'])]) if os.path.exists(covers_dir) else []
        preview_files = sorted([f for f in os.listdir(previews_dir) if f.endswith(('.mp4', '.mov', '.avi'))]) if os.path.exists(previews_dir) else []
        video_files = sorted([f for f in os.listdir(videos_dir) if f.endswith(('.mp4', '.mov', '.avi'))]) if os.path.exists(videos_dir) else []
        
        # Файлы для битов (WAV и ZIP)
        wav_files = sorted([f for f in os.listdir(test_files_dir) if f.endswith('.wav')]) if os.path.exists(test_files_dir) else []
        zip_files = sorted([f for f in os.listdir(test_files_dir) if f.endswith('.zip')]) if os.path.exists(test_files_dir) else []
        
        print(f"📁 Найдено файлов: {len(demo_files)} demo, {len(audio_files)} audio, {len(cover_files)} covers, {len(preview_files)} previews, {len(video_files)} videos")
        print(f"📁 Файлы для битов: {len(wav_files)} WAV, {len(zip_files)} ZIP")
        
        # Создаем тестовые биты (с нулевыми и ненулевыми ценами)
        genres = ["Hip-Hop", "Trap", "R&B", "Pop", "Drill"]
        keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        bpms = [140, 150, 160, 120, 130]
        
        test_beats = []
        for i in range(min(7, len(demo_files))):  # Создаем до 7 битов
            base_price = 0.0 if i < 2 else (5000.0 + i * 1000.0)  # Первые 2 бесплатные, остальные платные
            
            # Устанавливаем отдельные цены для каждого типа файла
            # MP3 - самая дешевая, WAV - средняя, Exclusive - самая дорогая
            if base_price == 0:
                price_mp3 = 0.0
                price_wav = 0.0
                price_exclusive = 0.0
            else:
                price_mp3 = base_price  # MP3 - базовая цена
                price_wav = base_price * 1.5  # WAV - на 50% дороже
                price_exclusive = base_price * 2.5  # Exclusive - в 2.5 раза дороже
            
            # Делаем биты с индексом 3, 4, 5 одноразовыми (после покупки исчезают)
            is_exclusive = i >= 3 and i <= 5
            title = f"Test Beat {i+1}" + (" (одноразовый)" if is_exclusive else "")
            test_beats.append({
                "title": title,
                "artist": f"Producer {i+1}",
                "genre": genres[i % len(genres)],
                "bpm": bpms[i % len(bpms)],
                "key": keys[i % len(keys)],
                "price": base_price,  # Базовая цена для обратной совместимости
                "price_mp3": price_mp3,
                "price_wav": price_wav,
                "price_exclusive": price_exclusive,
                "demo_index": i,
                "audio_index": i if i < len(audio_files) else None,
                "cover_index": i if i < len(cover_files) else None,
                "allow_multiple": not is_exclusive,  # Одноразовые биты не разрешают множественные покупки
            })
        
        for beat_data in test_beats:
            demo_url = f"/static/demos/{demo_files[beat_data['demo_index']]}" if beat_data['demo_index'] < len(demo_files) else None
            mp3_url = f"/static/audio/{audio_files[beat_data['audio_index']]}" if beat_data['audio_index'] is not None and beat_data['audio_index'] < len(audio_files) else None
            cover_url = f"/static/covers/{cover_files[beat_data['cover_index']]}" if beat_data['cover_index'] is not None and beat_data['cover_index'] < len(cover_files) else None
            
            # Добавляем WAV и ZIP файлы для всех битов
            wav_url = f"/static/test_files/{wav_files[0]}" if len(wav_files) > 0 else None
            exclusive_url = f"/static/test_files/{zip_files[0]}" if len(zip_files) > 0 else None
            
            beat = Beat(
                title=beat_data["title"],
                artist=beat_data["artist"],
                genre=beat_data["genre"],
                bpm=beat_data["bpm"],
                key=beat_data["key"],
                price=beat_data["price"],  # Базовая цена
                price_mp3=beat_data.get("price_mp3"),
                price_wav=beat_data.get("price_wav"),
                price_exclusive=beat_data.get("price_exclusive"),
                demo_url=demo_url,
                mp3_url=mp3_url,
                wav_url=wav_url,
                exclusive_url=exclusive_url,
                cover_url=cover_url,
                is_available=True,
                allow_multiple_purchases=beat_data.get("allow_multiple", True)  # Одноразовые биты имеют False
            )
            db.add(beat)
            price_info = f"MP3: {beat_data.get('price_mp3', beat_data['price'])}₽, WAV: {beat_data.get('price_wav', beat_data['price'])}₽, Exclusive: {beat_data.get('price_exclusive', beat_data['price'])}₽"
            print(f"✅ Создан бит: {beat_data['title']} ({price_info}) - MP3: {'✓' if mp3_url else '✗'}, WAV: {'✓' if wav_url else '✗'}, ZIP: {'✓' if exclusive_url else '✗'}")
        
        # Создаем тестовые курсы (с нулевыми и ненулевыми ценами)
        purposes = ["битмэйкинг", "сведение", "саунддизайн"]
        test_courses = []
        for i in range(min(4, len(preview_files))):  # Создаем до 4 курсов
            price = 0.0 if i < 1 else (10000.0 + i * 2000.0)  # Первый бесплатный, остальные платные
            test_courses.append({
                "title": f"Test Course {i+1}",
                "description": f"Тестовый курс по {purposes[i % len(purposes)]}",
                "purpose": purposes[i % len(purposes)],
                "price": price,
                "preview_index": i,
                "video_index": i if i < len(video_files) else None,
            })
        
        for course_data in test_courses:
            preview_url = f"/static/course_previews/{preview_files[course_data['preview_index']]}" if course_data['preview_index'] < len(preview_files) else None
            full_url = f"/static/course_videos/{video_files[course_data['video_index']]}" if course_data['video_index'] is not None and course_data['video_index'] < len(video_files) else None
            
            course = Course(
                title=course_data["title"],
                description=course_data["description"],
                purpose=course_data["purpose"],
                price=course_data["price"],
                preview_video_url=preview_url,
                full_video_url=full_url
            )
            db.add(course)
            print(f"✅ Создан курс: {course_data['title']} ({course_data['price']}₽)")
        
        db.commit()  # Сохраняем биты и курсы перед созданием покупок
        
        # Определяем текущее время для использования в покупках и заявках
        now = datetime.utcnow()
        
        # Создаем тестового пользователя для заявок и покупок
        test_user = db.query(User).filter(User.username == "test_user").first()
        if not test_user:
            test_user = User(
                username="test_user",
                email="test@example.com",
                password_hash=get_password_hash("test123"),
                is_active=True
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            print("✅ Создан тестовый пользователь")
        
        # Получаем созданные биты и курсы для покупок
        all_beats = db.query(Beat).all()
        all_courses = db.query(Course).all()
        
        # Создаем тестовые покупки битов
        if len(all_beats) >= 3:
            # Покупаем первые 3 бита (2 бесплатных + 1 платный)
            for i, beat in enumerate(all_beats[:3]):
                # Определяем тип покупки и соответствующую цену
                purchase_type = "mp3" if i < 2 else "wav"  # Для платного - WAV
                
                # Определяем цену в зависимости от типа покупки
                if purchase_type == 'mp3':
                    actual_price = beat.price_mp3 if beat.price_mp3 is not None else beat.price
                elif purchase_type == 'wav':
                    actual_price = beat.price_wav if beat.price_wav is not None else beat.price
                else:
                    actual_price = beat.price_exclusive if beat.price_exclusive is not None else beat.price
                
                purchase = Purchase(
                    user_id=test_user.id,
                    beat_id=beat.id,
                    purchase_date=now - timedelta(days=10-i*2),  # Разные даты
                    price_paid=actual_price,
                    purchase_type=purchase_type
                )
                db.add(purchase)
                print(f"✅ Создана покупка бита: {beat.title} ({purchase_type.upper()}, {actual_price}₽)")
        
        # Создаем тестовые покупки курсов
        if len(all_courses) >= 2:
            # Покупаем первые 2 курса (1 бесплатный + 1 платный)
            for i, course in enumerate(all_courses[:2]):
                course_purchase = CoursePurchase(
                    user_id=test_user.id,
                    course_id=course.id,
                    purchase_date=now - timedelta(days=8-i*3),  # Разные даты
                    price_paid=course.price
                )
                db.add(course_purchase)
                print(f"✅ Создана покупка курса: {course.title} ({course.price}₽)")
        
        db.commit()  # Сохраняем покупки
        
        # Создаем тестовые заявки (старые и новые)
        
        # Старые заявки (2-3 недели назад)
        old_orders = [
            {
                "order_type": "know",
                "service_categories": json.dumps(["бит", "сведение"]),
                "deadline_days": 14,
                "prepayment_percent": 50,
                "price": 55000.0,
                "status": "completed",
                "description": "Старая заявка - знаю что хочу",
                "created_at": now - timedelta(days=20),
            },
            {
                "order_type": "dont_know",
                "service_categories": None,
                "deadline_days": None,
                "prepayment_percent": None,
                "price": 30000.0,
                "status": "completed",
                "description": "Старая заявка - не знаю что хочу",
                "created_at": now - timedelta(days=15),
            },
        ]
        
        # Новые заявки (несколько дней назад и сегодня)
        new_orders = [
            {
                "order_type": "know",
                "service_categories": json.dumps(["бит в стиле трэп", "бит"]),
                "deadline_days": 7,
                "prepayment_percent": 100,
                "price": 45000.0,
                "status": "confirmed",
                "description": "Новая заявка - знаю что хочу",
                "created_at": now - timedelta(days=3),
            },
            {
                "order_type": "dont_know",
                "service_categories": None,
                "deadline_days": None,
                "prepayment_percent": None,
                "price": None,
                "status": "pending",
                "description": "Новая заявка - не знаю что хочу, нужна консультация",
                "created_at": now - timedelta(days=1),
            },
            {
                "order_type": "know",
                "service_categories": json.dumps(["трек под ключ"]),
                "deadline_days": 21,
                "prepayment_percent": 50,
                "price": 25000.0,
                "status": "paid",
                "description": "Заявка в работе",
                "created_at": now - timedelta(days=5),
            },
        ]
        
        all_orders = old_orders + new_orders
        
        for order_data in all_orders:
            order = ServiceOrder(
                user_id=test_user.id,
                order_type=order_data["order_type"],
                service_categories=order_data["service_categories"],
                deadline_days=order_data["deadline_days"],
                prepayment_percent=order_data["prepayment_percent"],
                price=order_data["price"],
                status=order_data["status"],
                description=order_data["description"],
                created_at=order_data["created_at"],
                updated_at=order_data["created_at"]
            )
            db.add(order)
            print(f"✅ Создана заявка: {order_data['order_type']} ({order_data['status']})")
        
        db.commit()
        print("✅ Тестовые данные успешно созданы!")
        
    except Exception as e:
        print(f"❌ Ошибка при создании тестовых данных: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_data()


