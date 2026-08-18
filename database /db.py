from pymongo import MongoClient
import config

client = MongoClient(config.MONGO_URI)

db = client["ACVerse_DB"]
users_col = db["users"]
stories_col = db["stories"]
orders_col = db["orders"]

def get_user_data(user_id: int):
    user = users_col.find_one({"user_id": int(user_id)})
    if not user:
        user = {
            "user_id": int(user_id),
            "unlocked_stories": [],
            "wishlist": []
        }
        users_col.insert_one(user)
    return user

def is_story_unlocked(user_id: int, story_id: str) -> bool:
    user = get_user_data(user_id)
    return story_id in user.get("unlocked_stories", [])
