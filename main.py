import os
import asyncio
import logging
from pyrogram import Client, idle
from flask import Flask, send_from_directory, jsonify, request
from threading import Thread
import config
from db import stories_col, orders_col, is_story_unlocked, get_user_data, users_col

# Logging चालू करें ताकि एरर साफ़ दिखें
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

web_app = Flask(__name__, static_folder="web")

# (यहाँ आपके Flask Routes वैसे ही रहेंगे)
@web_app.route('/')
def serve_index(): return send_from_directory('web', 'index.html')
@web_app.route('/<path:filename>')
def serve_static(filename): return send_from_directory('web', filename)

app = Client(
    "ACVerse_Bot",
    api_id=config.API_ID,
    api_hash=config.API_HASH,
    bot_token=config.BOT_TOKEN,
    plugins=dict(root="plugins")
)

web_app.config["BOT_CLIENT"] = app

def run_flask():
    port = int(os.environ.get("PORT", 8080))
    web_app.run(host="0.0.0.0", port=port, use_reloader=False)

async def main():
    # 1. Flask स्टार्ट करें
    Thread(target=run_flask, daemon=True).start()
    print("✅ Flask Server Thread started")
    
    # 2. Config Check
    print(f"Checking Config: API_ID={config.API_ID}, API_HASH length={len(config.API_HASH)}")
    
    # 3. Bot Start with Error Handling
    try:
        print("⏳ Attempting to connect to Telegram...")
        await app.start()
        print("🤖 ACVerse Bot Started Successfully!")
    except Exception as e:
        print(f"❌ CRITICAL ERROR starting bot: {e}")
        # यहाँ बॉट बंद हो जाएगा ताकि आप एरर देख सकें
        return

    await idle()
    await app.stop()

if __name__ == "__main__":
    asyncio.run(main())
