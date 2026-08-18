import os

# Telegram API Setup
API_ID = int(os.environ.get("API_ID", "12345678"))
API_HASH = os.environ.get("API_HASH", "your_api_hash_here")
BOT_TOKEN = os.environ.get("BOT_TOKEN", "your_bot_token_here")

# Admin Settings
ADMIN_ID = int(os.environ.get("ADMIN_ID", "123456789"))

# MongoDB Connection
MONGO_URI = os.environ.get("MONGO_URI", "mongodb+srv://your_mongo_url_here")

# Mini App & Payment Info
MINI_APP_URL = os.environ.get("MINI_APP_URL", "https://acverse.onrender.com")
UPI_ID = os.environ.get("UPI_ID", "6398324472@fam")
UPI_NAME = "ACVerse Store"
