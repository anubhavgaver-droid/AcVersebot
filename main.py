import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))# 'Import' को स्मॉल अक्षरों में सही किया गया
import asyncio
from pyrogram import Client
from flask import Flask, send_from_directory, jsonify, request
from threading import Thread
import config
from database.db import stories_col, orders_col, is_story_unlocked, get_user_data, users_col

web_app = Flask(__name__, static_folder="web")

@web_app.route('/')
def serve_index():
    return send_from_directory('web', 'index.html')

@web_app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('web', filename)

@web_app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify({
        "upi_id": config.UPI_ID,
        "upi_name": config.UPI_NAME
    })

@web_app.route('/api/stories', methods=['GET'])
def get_stories():
    stories = list(stories_col.find({}, {"_id": 0}))
    return jsonify(stories)

@web_app.route('/api/user_info', methods=['GET'])
def get_user_info():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    user = get_user_data(int(user_id))
    return jsonify({
        "unlocked_stories": user.get("unlocked_stories", []),
        "wishlist": user.get("wishlist", [])
    })

@web_app.route('/api/story_details', methods=['GET'])
def get_story_details():
    user_id = request.args.get("user_id")
    story_id = request.args.get("story_id")
    
    story = stories_col.find_one({"story_id": story_id}, {"_id": 0})
    if not story:
        return jsonify({"error": "Story not found"}), 404
        
    unlocked = is_story_unlocked(int(user_id), story_id) if user_id else False
    
    response_data = {
        "story_id": story["story_id"],
        "title": story["title"],
        "category": story["category"],
        "price": story["price"],
        "badge": story["badge"],
        "banner": story["banner"],
        "description": story["description"],
        "unlocked": unlocked
    }
    
    if unlocked:
        response_data["bot_link"] = story.get("bot_link", "")
        
    return jsonify(response_data)

@web_app.route('/api/toggle_wishlist', methods=['POST'])
def toggle_wishlist():
    data = request.json
    user_id = int(data.get("user_id"))
    story_id = data.get("story_id")
    
    user = get_user_data(user_id)
    wishlist = user.get("wishlist", [])
    
    if story_id in wishlist:
        users_col.update_one({"user_id": user_id}, {"$pull": {"wishlist": story_id}})
        status = "removed"
    else:
        users_col.update_one({"user_id": user_id}, {"$addToSet": {"wishlist": story_id}})
        status = "added"
        
    return jsonify({"success": True, "status": status})

@web_app.route('/api/submit_payment', methods=['POST'])
def submit_payment():
    data = request.json
    user_id = data.get("user_id")
    story_id = data.get("story_id")
    utr = data.get("utr")
    amount = data.get("amount")
    user_name = data.get("user_name", "User")

    if not user_id or not story_id or not utr:
        return jsonify({"success": False, "message": "Missing details"}), 400

    order_doc = {
        "user_id": int(user_id),
        "user_name": user_name,
        "story_id": story_id,
        "utr": utr,
        "amount": amount,
        "status": "PENDING"
    }
    result = orders_col.insert_one(order_doc)
    order_id = str(result.inserted_id)

    bot_client = web_app.config.get("BOT_CLIENT")
    if bot_client:
        story = stories_col.find_one({"story_id": story_id})
        story_title = story["title"] if story else story_id
        
        from pyrogram.types import InlineKeyboardMarkup, InlineKeyboardButton
        keyboard = InlineKeyboardMarkup([
            [
                InlineKeyboardButton("✅ Approve", callback_data=f"approve_{order_id}"),
                InlineKeyboardButton("❌ Reject", callback_data=f"reject_{order_id}")
            ]
        ])
        
        msg_text = (
            f"🔔 **NEW MANUAL PAYMENT APPROVAL** 🔔\n\n"
            f"👤 **User:** {user_name} (`{user_id}`)\n"
            f"📖 **Story:** {story_title}\n"
            f"💰 **Amount:** ₹{amount}\n"
            f"🧾 **UTR:** `{utr}`"
        )
        bot_client.loop.create_task(
            bot_client.send_message(config.ADMIN_ID, msg_text, reply_markup=keyboard)
        )

    return jsonify({"success": True, "message": "Payment sent for Admin verification!"})

# Pyrogram Bot Client Initialize
app = Client(
    "ACVerse_Bot",
    api_id=config.API_ID,
    api_hash=config.API_HASH,
    bot_token=config.BOT_TOKEN,
    plugins=dict(root="plugins")
)

web_app.config["BOT_CLIENT"] = app

def run_bot():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    app.start()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    
    # Pyrogram Bot को थ्रेड में सही Event Loop के साथ स्टार्ट करें
    Thread(target=run_bot, daemon=True).start()
    
    print(f"🚀 ACVerse Server Running on Port {port}!")
    
    # Render Web Service के लिए Flask रन करें
    web_app.run(host="0.0.0.0", port=port)
