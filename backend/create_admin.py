from database import SessionLocal
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

db = SessionLocal()
try:
    # Проверяем, существует ли пользователь
    existing_user = db.query(User).filter(User.username == 'www').first()
    if existing_user:
        print('Пользователь www уже существует')
    else:
        # Создаем нового пользователя
        hashed_password = pwd_context.hash('123')
        new_user = User(
            username='www',
            email='www@example.com',
            password_hash=hashed_password,
            is_admin=True
        )
        db.add(new_user)
        db.commit()
        print('Пользователь www создан успешно')
        print('Логин: www')
        print('Пароль: 123')
        print('Админ: Да')
except Exception as e:
    print(f'Ошибка: {e}')
finally:
    db.close()
