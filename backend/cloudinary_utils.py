"""
Утилита для работы с Cloudinary - облачным хранилищем файлов
"""

import cloudinary
import cloudinary.uploader
import os
from typing import Optional

# Настройка Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

def upload_audio_file(file_path: str, beat_id: int, file_type: str = "demo") -> Optional[str]:
    """
    Загружает аудио файл в Cloudinary
    
    Args:
        file_path: Путь к локальному файлу
        beat_id: ID бита
        file_type: Тип файла ('demo' или 'full')
    
    Returns:
        URL загруженного файла или None при ошибке
    """
    try:
        # Определяем папку в Cloudinary
        folder = f"beatstore/{file_type}s"
        
        # Загружаем файл
        result = cloudinary.uploader.upload(
            file_path,
            folder=folder,
            resource_type="video",  # Cloudinary обрабатывает аудио как видео
            public_id=f"beat_{beat_id}_{file_type}",
            overwrite=True
        )
        
        return result["secure_url"]
    except Exception as e:
        print(f"Ошибка загрузки аудио файла: {e}")
        return None

def upload_image_file(file_path: str, beat_id: int, file_type: str = "cover") -> Optional[str]:
    """
    Загружает изображение в Cloudinary
    
    Args:
        file_path: Путь к локальному файлу
        beat_id: ID бита
        file_type: Тип файла ('cover')
    
    Returns:
        URL загруженного файла или None при ошибке
    """
    try:
        # Определяем папку в Cloudinary
        folder = f"beatstore/{file_type}s"
        
        # Загружаем файл
        result = cloudinary.uploader.upload(
            file_path,
            folder=folder,
            resource_type="image",
            public_id=f"beat_{beat_id}_{file_type}",
            overwrite=True
        )
        
        return result["secure_url"]
    except Exception as e:
        print(f"Ошибка загрузки изображения: {e}")
        return None

def upload_file_from_bytes(file_bytes: bytes, beat_id: int, filename: str, file_type: str = "demo") -> Optional[str]:
    """
    Загружает файл из байтов в Cloudinary
    
    Args:
        file_bytes: Содержимое файла в байтах
        beat_id: ID бита
        filename: Имя файла
        file_type: Тип файла ('demo', 'full', 'cover')
    
    Returns:
        URL загруженного файла или None при ошибке
    """
    try:
        # Определяем папку и тип ресурса
        folder = f"beatstore/{file_type}s"
        resource_type = "video" if file_type in ["demo", "full"] else "image"
        
        # Загружаем файл
        result = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            resource_type=resource_type,
            public_id=f"beat_{beat_id}_{file_type}",
            overwrite=True
        )
        
        return result["secure_url"]
    except Exception as e:
        print(f"Ошибка загрузки файла: {e}")
        return None

def delete_file_from_cloudinary(url: str) -> bool:
    """
    Удаляет файл из Cloudinary по URL
    
    Args:
        url: URL файла в Cloudinary
    
    Returns:
        True если файл удален, False при ошибке
    """
    try:
        # Извлекаем public_id из URL
        # URL выглядит как: https://res.cloudinary.com/cloud_name/video/upload/v1234567890/beatstore/demos/beat_1_demo.mp3
        parts = url.split("/")
        if "cloudinary.com" in url and len(parts) > 6:
            public_id = "/".join(parts[6:]).split(".")[0]  # Убираем расширение файла
            
            # Определяем тип ресурса
            resource_type = "video" if "/video/" in url else "image"
            
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type=resource_type
            )
            
            return result.get("result") == "ok"
    except Exception as e:
        print(f"Ошибка удаления файла: {e}")
    
    return False
