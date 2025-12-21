"""
Простой Telegram бот для обработки команд
Обрабатывает команду /start и показывает кнопку для открытия Mini App
"""

import os
import requests
import time
from typing import Optional
from urllib.parse import quote

# Получаем токен из переменных окружения
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "XWinnerbeatpleasebot")
MINI_APP_URL = os.getenv("MINI_APP_URL", "")  # URL Mini App (будет установлен через BotFather)

TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


def get_updates(offset: Optional[int] = None):
    """Получает обновления от Telegram"""
    url = f"{TELEGRAM_API_URL}/getUpdates"
    params = {"timeout": 10, "allowed_updates": ["message"]}
    if offset:
        params["offset"] = offset
    
    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        result = response.json()
        if not result.get("ok"):
            print(f"Ошибка API Telegram: {result}")
        else:
            updates_count = len(result.get("result", []))
            if updates_count > 0:
                print(f"Получено обновлений: {updates_count}")
        return result
    except Exception as e:
        print(f"Ошибка при получении обновлений: {e}")
        import traceback
        traceback.print_exc()
        return None


def send_message(chat_id: int, text: str, reply_markup: Optional[dict] = None):
    """Отправляет сообщение пользователю"""
    url = f"{TELEGRAM_API_URL}/sendMessage"
    data = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if reply_markup:
        data["reply_markup"] = reply_markup
    
    try:
        print(f"Отправка сообщения chat_id={chat_id}, text='{text[:50]}...'")
        response = requests.post(url, json=data, timeout=10)
        response.raise_for_status()
        result = response.json()
        print(f"Сообщение отправлено успешно: {result.get('ok')}")
        return result
    except Exception as e:
        print(f"Ошибка при отправке сообщения: {e}")
        import traceback
        traceback.print_exc()
        return None


def create_menu_button():
    """Создает кнопку для открытия Mini App"""
    if not MINI_APP_URL:
        return None
    
    return {
        "inline_keyboard": [[
            {
                "text": "🚀 Открыть магазин",
                "web_app": {"url": MINI_APP_URL}
            }
        ]]
    }


def handle_start_command(chat_id: int, username: Optional[str] = None, start_param: Optional[str] = None, from_user: Optional[dict] = None):
    """Обрабатывает команду /start"""
    name = f"@{username}" if username else "друг"
    
    # Если команда /start с параметром auth - это запрос на авторизацию
    if start_param and start_param.startswith("auth"):
        # Получаем данные пользователя из сообщения
        first_name = from_user.get("first_name", "") if from_user else ""
        last_name = from_user.get("last_name", "") if from_user else ""
        
        # Создаем URL для возврата на сайт с данными авторизации
        site_url = os.getenv("FRONTEND_URL", "https://unvisited-eve-unadjusted.ngrok-free.dev")
        auth_url = f"{site_url}/login?telegram_auth=1&chat_id={chat_id}&username={quote(username or '')}&first_name={quote(first_name)}&last_name={quote(last_name)}"
        
        text = f"""
✅ Авторизация через Telegram

👋 Привет, {name}!

Для завершения авторизации нажмите кнопку ниже, чтобы вернуться на сайт.

После возврата на сайт авторизация произойдет автоматически.
"""
        
        reply_markup = {
            "inline_keyboard": [[
                {
                    "text": "🔐 Вернуться на сайт",
                    "url": auth_url
                }
            ]]
        }
        
        send_message(chat_id, text, reply_markup)
        return
    
    # Обычная команда /start - ВСЕГДА показываем кнопку "Открыть магазин"
    text = f"""
👋 Привет, {name}!

Добро пожаловать в <b>XWinner.beats.please</b>!

🎵 Здесь ты можешь:
• Прослушать и купить биты
• Заказать услуги (сведение, саунддизайн и т.д.)
• Пройти обучение по созданию музыки

Нажми кнопку ниже, чтобы открыть магазин 👇
"""
    
    reply_markup = create_menu_button()
    send_message(chat_id, text, reply_markup)


def handle_message(message: dict):
    """Обрабатывает входящие сообщения"""
    chat_id = message.get("chat", {}).get("id")
    text = message.get("text", "").strip() if message.get("text") else ""
    username = message.get("from", {}).get("username")
    
    print(f"Получено сообщение: chat_id={chat_id}, text='{text}', username={username}")
    
    if not chat_id:
        print("Ошибка: chat_id отсутствует")
        return
    
    # Обработка команды /start (с параметрами или без)
    if text.startswith("/start"):
        print(f"Обработка команды /start для chat_id={chat_id}")
        # Извлекаем параметр из команды /start auth_xxx
        start_param = None
        if " " in text:
            start_param = text.split(" ", 1)[1]
        # Получаем данные пользователя из сообщения
        from_user = message.get("from", {})
        handle_start_command(chat_id, username, start_param, from_user)
    else:
        # На любое другое сообщение отвечаем подсказкой
        print(f"Неизвестная команда: '{text}'")
        help_text = """
🤔 Не понимаю эту команду.

Используйте /start чтобы начать работу с ботом.
"""
        send_message(chat_id, help_text)


def main():
    """Основной цикл бота"""
    if not TELEGRAM_BOT_TOKEN:
        print("❌ Ошибка: TELEGRAM_BOT_TOKEN не установлен!")
        print("Установите переменную окружения TELEGRAM_BOT_TOKEN")
        return
    
    print("=" * 50)
    print("🤖 Telegram бот запущен")
    print(f"📱 Username: @{TELEGRAM_BOT_USERNAME}")
    if MINI_APP_URL:
        print(f"🔗 Mini App URL: {MINI_APP_URL}")
    else:
        print("⚠️  Mini App URL не установлен (MINI_APP_URL)")
    print("=" * 50)
    print("Ожидание сообщений...")
    print("Нажмите Ctrl+C для остановки")
    print("=" * 50)
    
    last_update_id = None
    
    while True:
        try:
            updates = get_updates(last_update_id)
            
            if not updates or not updates.get("ok"):
                time.sleep(1)
                continue
            
            for update in updates.get("result", []):
                update_id = update.get("update_id")
                if update_id:
                    last_update_id = update_id + 1
                
                # Обработка сообщений
                if "message" in update:
                    message = update["message"]
                    print(f"Обработка сообщения: update_id={update_id}, message_id={message.get('message_id')}")
                    handle_message(message)
                
                # Обработка callback_query (нажатия на кнопки)
                elif "callback_query" in update:
                    callback_query = update["callback_query"]
                    chat_id = callback_query.get("message", {}).get("chat", {}).get("id")
                    if chat_id:
                        # Отвечаем на callback
                        requests.post(
                            f"{TELEGRAM_API_URL}/answerCallbackQuery",
                            json={"callback_query_id": callback_query["id"]}
                        )
            
            time.sleep(0.5)
            
        except KeyboardInterrupt:
            print("\n\n🛑 Остановка бота...")
            break
        except Exception as e:
            print(f"Ошибка в основном цикле: {e}")
            time.sleep(5)


if __name__ == "__main__":
    main()

