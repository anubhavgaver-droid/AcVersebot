from pyrogram import Client, filters
from pyrogram.types import CallbackQuery
from bson.objectid import ObjectId
import config
from db import stories_col, orders_col, users_col
import uuid

# Usage: /addstory Category | Title | Price | Badge | BannerURL | Description | FileStoreBotLink
@Client.on_message(filters.command("addstory") & filters.user(config.ADMIN_ID))
async def add_story_cmd(client, message):
    try:
        raw_text = message.text.split("/addstory ")[1]
        cat, title, price, badge, banner, desc, bot_link = [x.strip() for x in raw_text.split("|")]
        
        story_id = f"story_{uuid.uuid4().hex[:6]}"
        
        doc = {
            "story_id": story_id,
            "category": cat,
            "title": title,
            "price": float(price),
            "badge": badge,
            "banner": banner,
            "description": desc,
            "bot_link": bot_link
        }
        stories_col.insert_one(doc)
        
        bot = await client.get_me()
        share_link = f"https://t.me/{bot.username}?start={story_id}"
        
        await message.reply_text(
            f"✅ **Story Published to ACVerse!**\n\n"
            f"🆔 `ID:` `{story_id}`\n"
            f"📖 `Title:` {title}\n"
            f"💰 `Price:` ₹{price}\n"
            f"🔗 `Bot Link:` `{bot_link}`\n"
            f"📲 `Share Link:` `{share_link}`"
        )
    except Exception as e:
        await message.reply_text("❌ **Format:** `/addstory Category | Title | Price | Badge | BannerURL | Description | FileStoreBotLink`")

@Client.on_callback_query(filters.regex("^(approve|reject)_"))
async def handle_payment_approval(client, callback: CallbackQuery):
    if callback.from_user.id != config.ADMIN_ID:
        return await callback.answer("⚠️ Unauthorized!", show_alert=True)
    
    action, order_id = callback.data.split("_", 1)
    order = orders_col.find_one({"_id": ObjectId(order_id)})
    
    if not order or order["status"] != "PENDING":
        return await callback.answer("⚠️ Already Processed!", show_alert=True)
        
    user_id = order["user_id"]
    story_id = order["story_id"]
    
    if action == "approve":
        orders_col.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": "APPROVED"}})
        users_col.update_one(
            {"user_id": int(user_id)},
            {"$addToSet": {"unlocked_stories": story_id}},
            upsert=True
        )
        
        story = stories_col.find_one({"story_id": story_id})
        story_title = story["title"] if story else story_id
        
        await callback.edit_message_text(f"{callback.message.text.html}\n\n✅ **APPROVED & UNLOCKED IN MONGODB**")
        
        from pyrogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
        app_link = f"{config.MINI_APP_URL}/?story_id={story_id}"
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("🚀 OPEN STORY IN MINI APP", web_app=WebAppInfo(url=app_link))]
        ])
        
        try:
            await client.send_message(
                user_id,
                f"🎉 **PAYMENT APPROVED!** 🎉\n\n"
                f"आपकी स्टोरी **{story_title}** मिनी ऐप में अनलॉक हो गई है!\n"
                f"नीचे बटन पर क्लिक करके स्टोरी फाइल्स तक पहुँचें 👇",
                reply_markup=keyboard
            )
        except Exception:
            pass
            
    elif action == "reject":
        orders_col.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": "REJECTED"}})
        await callback.edit_message_text(f"{callback.message.text.html}\n\n❌ **REJECTED BY ADMIN**")
