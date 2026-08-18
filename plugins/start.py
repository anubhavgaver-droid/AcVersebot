from pyrogram import Client, filters
from pyrogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
import config

@Client.on_message(filters.command("start") & filters.private)
async def start_handler(client, message):
    user = message.from_user
    
    # Check Deep-Link (/start story_xxx)
    if len(message.command) > 1:
        story_id = message.command[1]
        target_url = f"{config.MINI_APP_URL}/?story_id={story_id}"
        
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("⚡ VIEW STORY IN ACVERSE", web_app=WebAppInfo(url=target_url))]
        ])
        await message.reply_text(
            f"🔥 **ACVerse Story Link** 🔥\n\n"
            f"Hey **{user.first_name}**! Click below to view details:",
            reply_markup=keyboard
        )
    else:
        target_url = f"{config.MINI_APP_URL}/"
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("🚀 OPEN ACVERSE MINI APP", web_app=WebAppInfo(url=target_url))]
        ])
        await message.reply_text(
            f"🔥 **WELCOME TO ACVERSE STORE** 🔥\n\n"
            f"Hello **{user.first_name}**!\nYour ultimate hub for Pocket & Pratilipi FM stories.\n\n"
            f"👇 Click below to launch:",
            reply_markup=keyboard
        )
