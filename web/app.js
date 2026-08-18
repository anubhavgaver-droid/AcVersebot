Const tg = window.Telegram?.WebApp;
if (tg) {
    Tg.expand();
    Tg.ready();
}

Let allStories = [];
let userUnlockedStories = [];
let userWishlist = [];
let upiConfig = { upi_id: "6398324472@fam" };
let currentStory = null;

Const userId = tg?.initDataUnsafe?.user?.id || 12345678;
const userName = tg?.initDataUnsafe?.user?.first_name 
    ? (tg.initDataUnsafe.user.first_name + (tg.initDataUnsafe.user.last_name ? " " + tg.initDataUnsafe.user.last_name : ""))
    : "Guest User";

// 🔔 Haptic Feedback Engine
function haptic(type = "light") {
    If (tg?.HapticFeedback) {
        If (type === "success") tg.HapticFeedback.notificationOccurred("success");
        Else if (type === "error") tg.HapticFeedback.notificationOccurred("error");
        Else tg.HapticFeedback.impactOccurred(type);
    }
}

Document.addEventListener("DOMContentLoaded", () => {
    // User Profile Information
    Const userNameEl = document.getElementById("userName");
    Const userIdEl = document.getElementById("userId");
    If (userNameEl) userNameEl.innerText = userName;
    If (userIdEl) userIdEl.innerText = `ID: ${userId}`;

    // Config Fetching
    Fetch('/api/config')
        .then(res => res.json())
        .then(cfg => { if (cfg && cfg.upi_id) upiConfig = cfg; })
        .catch(err => console.log("Config fetch bypass"));

    // Router and Splash handling
    StartAppRouter();
});

// Router Logic for Animations
function startAppRouter() {
    Const params = new URLSearchParams(window.location.search);
    Const storyId = params.get('story_id') || params.get('startapp') || tg?.initDataUnsafe?.start_param;

    If (storyId) {
        RunDirectLinkAnimation(storyId);
    } else {
        RunNormalWelcomeSplash();
    }
}

// 1. Welcome Splash Screen Animation
function runNormalWelcomeSplash() {
    Const splash = document.getElementById('app-splash-loader');
    If (splash) splash.classList.remove('hidden');

    LoadInitialData().then(() => {
        SetTimeout(() => {
            If (splash) splash.classList.add('hidden');
        }, 2000);
    });
}

// 2. Direct Story Link Animation (0-100% Loader)
function runDirectLinkAnimation(storyId) {
    Const loader = document.getElementById('direct-loader');
    Const progressVal = document.getElementById('progress-val');
    Const progressBar = document.getElementById('progressBar');
    If (loader) loader.classList.remove('hidden');

    Let progress = 0;
    Const interval = setInterval(() => {
        Progress += Math.floor(Math.random() * 8) + 5;
        If (progress >= 100) {
            Progress = 100;
            ClearInterval(interval);

            LoadInitialData().then(() => {
                SetTimeout(() => {
                    If (loader) loader.classList.add('hidden');
                    OpenModal(storyId);
                }, 300);
            });
        }
        If (progressVal) progressVal.innerText = progress;
        If (progressBar) progressBar.style.width = progress + '%';
    }, 50);
}

// API Data Fetching
function loadInitialData() {
    Return fetch(`/api/user_info?user_id=${userId}`)
        .then(res => res.json())
        .then(usr => {
            UserUnlockedStories = usr.unlocked_stories || [];
            UserWishlist = usr.wishlist || [];

            Const unlockedEl = document.getElementById("unlockedCount");
            Const headerUnlockedEl = document.getElementById("headerUnlockedCount");
            Const wishlistStatusEl = document.getElementById("wishlistStatus");

            If (unlockedEl) unlockedEl.innerText = userUnlockedStories.length;
            If (headerUnlockedEl) headerUnlockedEl.innerText = userUnlockedStories.length;

            If (wishlistStatusEl) {
                WishlistStatusEl.innerText = userWishlist.length > 0 
                    ? `${userWishlist.length} Stories Saved` 
                    : "No saved stories yet!";
            }

            Return fetch('/api/stories');
        })
        .then(res => res.json())
        .then(data => {
            AllStories = data || [];
            Const totalShowsEl = document.getElementById("totalShows");
            If (totalShowsEl) totalShowsEl.innerText = allStories.length;

            RenderStories(allStories, 'storiesGrid');
            RenderStories(allStories, 'exploreGrid');
            RenderUnlockedLibrary();
        })
        .catch(err => console.error("Data Loading Failed:", err));
}

// Render Stories to Grid
function renderStories(stories, targetGridId = 'storiesGrid') {
    Const grid = document.getElementById(targetGridId);
    If (!grid) return;

    If (stories.length === 0) {
        Grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #777; font-size: 12px; padding: 20px;">No stories found</p>`;
        Return;
    }

    Grid.innerHTML = stories.map(s => {
        Const isWished = userWishlist.includes(s.story_id);
        Const badgeText = s.badge || s.platform || "POCKET FM";
        Return `
            <div class="story-card">
                <div class="wishlist-heart ${isWished ? 'active' : ''}" onclick="toggleWishlist('${s.story_id}', event)">
                    ${isWished ? '❤️' : '🤍'}
                </div>
                <img class="poster-img" src="${s.banner}" alt="${s.title}">
                <div class="card-body">
                    <span class="platform-badge">${badgeText}</span>
                    <div class="story-title">${s.title}</div>
                    <div class="story-price">₹${s.price}</div>
                    <button class="view-btn" onclick="openModal('${s.story_id}')">VIEW DETAILS</button>
                </div>
            </div>
        `;
    }).join('');
}

// Unlocked Orders Tab
function renderUnlockedLibrary() {
    Const unlockedList = document.getElementById("unlockedList");
    If (!unlockedList) return;

    Const purchased = allStories.filter(s => userUnlockedStories.includes(s.story_id));
    If (purchased.length === 0) {
        UnlockedList.innerHTML = `<p style="font-size: 12px; color: #777;">No unlocked stories found!</p>`;
        Return;
    }

    UnlockedList.innerHTML = purchased.map(s => `
        <div style="display: flex; align-items: center; justify-content: space-between; border: 2px solid var(--border); padding: 8px; border-radius: 8px; margin-bottom: 8px; background: var(--card-bg);">
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${s.banner}" style="width: 40px; height: 50px; object-fit: cover; border-radius: 5px;">
                <div>
                    <div style="font-size: 12px; font-weight: bold;">${s.title}</div>
                    <span class="platform-badge" style="font-size: 8px;">UNLOCKED 🟢</span>
                </div>
            </div>
            <button class="view-btn" style="width: auto; padding: 6px 12px;" onclick="openModal('${s.story_id}')">OPEN</button>
        </div>
    `).join('');
}

// Story Details Modal View
function openModal(storyId) {
    Haptic('medium');

    Fetch(`/api/story_details?user_id=${userId}&story_id=${storyId}`)
        .then(res => res.json())
        .then(story => {
            CurrentStory = story;
            Const container = document.getElementById("modalContainer");
            Const badgeText = story.badge || story.platform || "POCKET FM";

            If (story.unlocked) {
                Container.innerHTML = `
                    <div class="hero-backdrop">
                        <img class="bg-blur" src="${story.banner}">
                        <img class="poster-corner" src="${story.banner}">
                    </div>
                    <div class="story-meta">
                        <span class="platform-badge">${badgeText}</span>
                        <h2 style="margin: 6px 0;">${story.title}</h2>
                        <div style="background: rgba(0, 255, 127, 0.1); border: 2px solid #00ff7f; padding: 12px; border-radius: 10px; text-align: center; margin: 10px 0;">
                            <h4 style="color: #00ff7f; margin-bottom: 4px;">🟢 STORY UNLOCKED</h4>
                            <p style="font-size: 11px; color: #aaa; margin-bottom: 10px;">Clicking below will launch the bot to get files.</p>
                            <button class="btn-buy" style="width: 100%; background: var(--accent);" onclick="redirectToBot('${story.bot_link}')">
                                🚀 GET FILES IN BOT
                            </button>
                        </div>
                        <p class="desc-box">${story.description || 'No description available.'}</p>
                    </div>
                `;
            } else {
                Container.innerHTML = `
                    <div class="hero-backdrop">
                        <img class="bg-blur" src="${story.banner}">
                        <img class="poster-corner" src="${story.banner}">
                    </div>
                    <div class="story-meta">
                        <span class="platform-badge">${badgeText}</span>
                        <h2 style="margin: 6px 0;">${story.title}</h2>
                        <div class="genre-tag">${story.genre || 'Audio Series'}</div>
                        <p class="desc-box">${story.description || 'No description available.'}</p>
                    </div>
                    <div class="buy-footer">
                        <div>
                            <span style="font-size:10px; color:#777;">TOTAL PRICE</span>
                            <div style="font-size:18px; font-weight:900;">₹${story.price}</div>
                        </div>
                        <button class="btn-buy" onclick="openPaymentModal()">BUY & UNLOCK</button>
                    </div>
                `;
            }

            Const modal = document.getElementById("storyModal");
            If (modal) modal.classList.remove("hidden");
        })
        .catch(err => {
            If (tg) tg.showAlert("Error loading story details!");
        });
}

Function closeModal() {
    Haptic('light');
    Const modal = document.getElementById("storyModal");
    If (modal) modal.classList.add("hidden");
}

// Payment Modal Popups
function openPaymentModal() {
    Haptic('medium');
    CloseModal();

    Const payAmountVal = document.getElementById('payAmountVal');
    Const upiIdText = document.getElementById('upiIdText');
    Const paymentQr = document.getElementById('paymentQr');
    Const payModal = document.getElementById('paymentModal');

    If (payAmountVal) payAmountVal.innerText = currentStory.price;
    If (upiIdText) upiIdText.innerText = upiConfig.upi_id;
    If (paymentQr) {
        PaymentQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${upiConfig.upi_id}%26pn=ACVerse%26am=${currentStory.price}`;
    }

    If (payModal) payModal.classList.remove('hidden');
}

Function closePaymentModal() {
    Haptic('light');
    Const payModal = document.getElementById('paymentModal');
    If (payModal) payModal.classList.add('hidden');
}

Function copyUpi() {
    Navigator.clipboard.writeText(upiConfig.upi_id);
    Haptic('success');
    If (tg) tg.showAlert("✅ UPI ID Copied to clipboard!");
}

// UTR Submission
function submitTransaction() {
    Const utrInput = document.getElementById("utrInput");
    Const utr = utrInput ? UtrInput.value.trim() : "";
    
    If (!utr || utr.length < 6) {
        Haptic('error');
        If (tg) tg.showAlert("⚠️ Please enter a valid UTR / Ref No.!");
        Return;
    }

    Haptic('medium');
    Const submitBtn = document.getElementById("submitPayBtn");
    If (submitBtn) {
        SubmitBtn.disabled = true;
        SubmitBtn.innerText = "SUBMITTING...";
    }

    Fetch('/api/submit_payment', {
        Method: 'POST',
        Headers: { 'Content-Type': 'application/json' },
        Body: JSON.stringify({
            User_id: userId,
            User_name: userName,
            Story_id: currentStory.story_id,
            Amount: currentStory.price,
            Utr: utr
        })
    })
    .then(res => res.json())
    .then(data => {
        If (submitBtn) {
            SubmitBtn.disabled = false;
            SubmitBtn.innerText = "SUBMIT PAYMENT 🚀";
        }

        If (data.success) {
            Haptic('success');
            If (tg) tg.showAlert("✅ Payment Sent for Approval!\nYour payment details have been sent to our admin for verification.");
            ClosePaymentModal();
        } else {
            Haptic('error');
            If (tg) tg.showAlert("❌ Error: " + data.message);
        }
    })
    .catch(err => {
        If (submitBtn) {
            SubmitBtn.disabled = false;
            SubmitBtn.innerText = "SUBMIT PAYMENT 🚀";
        }
        Haptic('error');
        If (tg) tg.showAlert("❌ Payment details sent to admin!");
        ClosePaymentModal();
    });
}

Function redirectToBot(botLink) {
    Haptic('medium');
    If (tg && tg.openTelegramLink) {
        Tg.openTelegramLink(botLink);
        Tg.close();
    } else {
        Window.open(botLink, '_blank');
    }
}

Function toggleWishlist(storyId, evt) {
    If (evt) evt.stopPropagation();
    Haptic('selection');

    Fetch('/api/toggle_wishlist', {
        Method: 'POST',
        Headers: { 'Content-Type': 'application/json' },
        Body: JSON.stringify({ user_id: userId, story_id: storyId })
    })
    .then(res => res.json())
    .then(data => {
        If (data.status === 'added') {
            UserWishlist.push(storyId);
        } else {
            UserWishlist = userWishlist.filter(id => id !== storyId);
        }
        
        Const wishlistStatusEl = document.getElementById("wishlistStatus");
        If (wishlistStatusEl) {
            WishlistStatusEl.innerText = userWishlist.length > 0 
                ? `${userWishlist.length} Stories Saved` 
                : "No saved stories yet!";
        }

        RenderStories(allStories, 'storiesGrid');
        RenderStories(allStories, 'exploreGrid');
    });
}

// Navigation Tabs (Updated with Auto-Dismiss for Modals)
Function switchTab(tabName, btn) {
    Haptic('selection');

    // 1. Koi bhi modal khula ho toh automatic close karein
    CloseModal();
    ClosePaymentModal();

    // 2. Hide all tab views
    Document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));
    Document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // 3. Show target view
    Const activeView = document.getElementById(`view-${tabName}`);
    If (activeView) activeView.classList.remove('hidden');

    // 4. Highlight active button
    If (btn) {
        Btn.classList.add('active');
    } else {
        Const matchingBtn = document.querySelector(`.nav-btn[onclick*="'${tabName}'"]`);
        If (matchingBtn) matchingBtn.classList.add('active');
    }
}

// Filters
Function filterCat(cat, evt) {
    Haptic('light');
    Document.querySelectorAll('.tag').forEach(b => b.classList.remove('active'));
    If (evt && evt.target) evt.target.classList.add('active');

    If (cat === 'All') {
        RenderStories(allStories, 'storiesGrid');
    } else {
        RenderStories(allStories.filter(s => s.category === cat || s.badge === cat || s.platform === cat), 'storiesGrid');
    }
}

Function filterStories() {
    Const searchInput = document.getElementById("searchInput");
    Const q = searchInput ? SearchInput.value.toLowerCase() : "";
    Const filtered = allStories.filter(s => s.title.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)));
    RenderStories(filtered, 'storiesGrid');
}

Function filterStoriesExplore() {
    Const exploreInput = document.getElementById("exploreInput");
    Const q = exploreInput ? ExploreInput.value.toLowerCase() : "";
    Const filtered = allStories.filter(s => s.title.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)));
    RenderStories(filtered, 'exploreGrid');
}

Function setTheme(theme, evt) {
    Haptic('light');
    Document.body.className = theme;
    Document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active-theme'));
    
    Const targetBtn = evt ? Evt.target : (typeof event !== 'undefined' ? Event.target : null);
    If (targetBtn) targetBtn.classList.add('active-theme');
}
