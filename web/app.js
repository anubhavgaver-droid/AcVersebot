const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

let allStories = [];
let userUnlockedStories = [];
let userWishlist = [];
let upiConfig = { upi_id: "6398324472@fam" };

document.addEventListener("DOMContentLoaded", () => {
    const userId = tg?.initDataUnsafe?.user?.id || 12345678;

    // Fetch User Profile
    if (tg?.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        document.getElementById("userName").innerText = u.first_name + (u.last_name ? " " + u.last_name : "");
        document.getElementById("userId").innerText = `ID: ${u.id}`;
    }

    // Fetch Config Details
    fetch('/api/config')
        .then(res => res.json())
        .then(cfg => { upiConfig = cfg; });

    // Fetch User Info (Unlocked & Wishlist from MongoDB)
    fetch(`/api/user_info?user_id=${userId}`)
        .then(res => res.json())
        .then(usr => {
            userUnlockedStories = usr.unlocked_stories || [];
            userWishlist = usr.wishlist || [];
            
            document.getElementById("unlockedCount").innerText = userUnlockedStories.length;
            document.getElementById("headerUnlockedCount").innerText = userUnlockedStories.length;
            
            if (userWishlist.length > 0) {
                document.getElementById("wishlistStatus").innerText = `${userWishlist.length} Stories Saved`;
            }

            // Fetch Stories List
            return fetch('/api/stories');
        })
        .then(res => res.json())
        .then(data => {
            allStories = data;
            document.getElementById("totalShows").innerText = allStories.length;
            renderStories(allStories);
            
            // Check Deep Link Query Params
            const params = new URLSearchParams(window.location.search);
            const storyId = params.get('story_id');
            if (storyId) openModal(storyId);
        });
});

function renderStories(stories) {
    const grid = document.getElementById("storiesGrid");
    const userId = tg?.initDataUnsafe?.user?.id || 12345678;

    grid.innerHTML = stories.map(s => {
        const isWished = userWishlist.includes(s.story_id);
        return `
            <div class="story-card">
                <div class="wishlist-heart ${isWished ? 'active' : ''}" onclick="toggleWishlist('${s.story_id}', event)">
                    ${isWished ? '❤️' : '🤍'}
                </div>
                <img src="${s.banner}" alt="${s.title}">
                <div class="card-body">
                    <span class="badge-blue">${s.badge}</span>
                    <div class="card-title">${s.title}</div>
                    <div class="price-tag">₹${s.price}</div>
                    <button class="view-btn" onclick="openModal('${s.story_id}')">VIEW DETAILS</button>
                </div>
            </div>
        `;
    }).join('');
}

function filterCat(cat, evt) {
    document.querySelectorAll('.tag').forEach(b => b.classList.remove('active'));
    evt.target.classList.add('active');
    
    if (cat === 'All') renderStories(allStories);
    else renderStories(allStories.filter(s => s.category === cat || s.badge === cat));
}

function filterStories() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    renderStories(allStories.filter(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)));
}

function filterPurchased() {
    const purchased = allStories.filter(s => userUnlockedStories.includes(s.story_id));
    renderStories(purchased);
}

function toggleWishlist(storyId, evt) {
    evt.stopPropagation();
    const userId = tg?.initDataUnsafe?.user?.id || 12345678;

    fetch('/api/toggle_wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, story_id: storyId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'added') userWishlist.push(storyId);
        else userWishlist = userWishlist.filter(id => id !== storyId);
        renderStories(allStories);
    });
}

function openModal(storyId) {
    const userId = tg?.initDataUnsafe?.user?.id || 12345678;

    fetch(`/api/story_details?user_id=${userId}&story_id=${storyId}`)
        .then(res => res.json())
        .then(story => {
            const container = document.getElementById("modalContainer");

            if (story.unlocked) {
                // 🔓 UNLOCKED STATUS: Redirection Button (Swipes Down Mini App)
                container.innerHTML = `
                    <span class="badge-blue">${story.badge}</span>
                    <h2 style="margin: 10px 0;">${story.title}</h2>
                    <div style="background: #1c1c24; border: 3px solid #00ff7f; padding: 15px; border-radius: 12px; text-align: center; margin-top: 15px;">
                        <h4 style="color: #00ff7f; margin-bottom: 8px;">🟢 STORY UNLOCKED</h4>
                        <p style="font-size: 12px; color: #aaa; margin-bottom: 15px;">Clicking below will swipe down the Mini App & launch the File Store Bot.</p>
                        
                        <button class="buy-btn" style="background: #ffcc00; color: #000;" onclick="redirectToBot('${story.bot_link}')">
                            🚀 GET FILES IN BOT (REDIRECT)
                        </button>
                    </div>
                    <div class="desc-box" style="margin-top: 15px;">${story.description}</div>
                `;
            } else {
                // 🔒 LOCKED STATUS: Manual UPI Form
                container.innerHTML = `
                    <span class="badge-blue">${story.badge}</span>
                    <h2>${story.title}</h2>
                    <div class="desc-box">${story.description}</div>

                    <div class="upi-pay-box" style="border: 3px solid var(--border); padding: 15px; border-radius: 12px; background: #192c38; margin-top: 15px;">
                        <h4>💳 UNLOCK FULL STORY</h4>
                        <p style="font-size: 12px; margin: 5px 0;">Pay to UPI ID: <b style="color: var(--accent);">${upiConfig.upi_id}</b></p>
                        <p style="font-size: 16px; font-weight: bold; color: #00ff7f;">Price: ₹${story.price}</p>

                        <input type="text" id="utrInput" style="width: 100%; padding: 10px; margin: 10px 0; border-radius: 8px; border: 2px solid #000; font-weight: bold;" placeholder="Enter 12-Digit UTR / Ref No." />
                        <button class="buy-btn" onclick="submitTransaction('${story.story_id}', ${story.price})">SUBMIT UTR FOR APPROVAL 🚀</button>
                    </div>
                `;
            }

            document.getElementById("storyModal").style.display = "flex";
        });
}

function closeModal() {
    document.getElementById("storyModal").style.display = "none";
}

// 🚀 Magic Function: Opens External Telegram Bot Link and Closes Mini App
function redirectToBot(botLink) {
    if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(botLink);
        tg.close();
    } else {
        window.open(botLink, '_blank');
    }
}

function submitTransaction(storyId, price) {
    const utr = document.getElementById("utrInput").value.trim();
    if (!utr) {
        alert("Please enter a valid UTR Number!");
        return;
    }

    const userId = tg?.initDataUnsafe?.user?.id || 12345678;
    const userName = tg?.initDataUnsafe?.user?.first_name || "User";

    fetch('/api/submit_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            user_name: userName,
            story_id: storyId,
            amount: price,
            utr: utr
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("✅ Payment Sent for Approval!\nAdmin status will update your access automatically.");
            closeModal();
        } else {
            alert("❌ Error: " + data.message);
        }
    });
}

function setTheme(theme) {
    document.body.className = theme;
}
