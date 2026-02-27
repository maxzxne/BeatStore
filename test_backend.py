#!/usr/bin/env python3
"""
Скрипт для тестирования бэкенда
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Проверка health эндпоинта"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health check: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_register():
    """Тест регистрации"""
    try:
        data = {
            "email": "test@test.com",
            "username": "testuser",
            "password": "test123"
        }
        response = requests.post(f"{BASE_URL}/register", json=data)
        print(f"Register: {response.status_code}")
        if response.status_code == 200:
            print(f"Success: {response.json()}")
        else:
            print(f"Error: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Register test failed: {e}")
        return False

def test_login():
    """Тест логина"""
    try:
        data = {
            "username": "admin",
            "password": "admin123"
        }
        response = requests.post(f"{BASE_URL}/login", json=data)
        print(f"Login: {response.status_code}")
        if response.status_code == 200:
            print(f"Success: Token received")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Login test failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Тестирование бэкенда")
    print("=" * 50)
    
    print("\n1. Проверка health...")
    if not test_health():
        print("Бэкенд не отвечает! Убедитесь, что он запущен.")
        exit(1)
    
    print("\n2. Тест логина админа...")
    test_login()
    
    print("\n3. Тест регистрации...")
    test_register()


