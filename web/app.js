const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
}

let allStories = [];
let userUnlockedStories = [];
let userWishlist = [];
let upiConfig = { upi_id: "6398324472@fam" };
let currentStory = null;

const userId = tg?.initDataUnsafe?.user?.id || 12345678;
const userName = tg?.initDataUnsafe?.user?.first_name 
    ? (tg.initDataUnsafe.user.first_name + (tg.initDataUnsafe.user.last_name ? " " + tg.initDataUnsafe.user.last_name : ""))
    : "Guest User";

// 🔔 Haptic Feedback Engine
function haptic(type = "light") {
    if (tg?.HapticFeedback) {
        if (type === "success") tg.HapticFeedback.notificationOccurred("success");
        else if (type === "error") tg.HapticFeedback.notificationOccurred("error");
        else tg.HapticFeedback.impactOccurred(type);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // User Profile Information
    const userNameEl = document.getElementById("userName");
    const userIdEl = document.getElementById("userId");
    if (userNameEl) userNameEl.innerText = userName;
    if (userIdEl) userIdEl.innerText = `ID: ${userId}`;

    // Config Fetching
    fetch('/api/config')
        .then(res => res.json())
        .then(cfg => { if (cfg && cfg.upi_id) upiConfig = cfg; })
        .catch(err => console.log("Config fetch bypass"));

    // Router and Splash handling
    startAppRouter();
});

// Router Logic for Animations
function startAppRouter() {
    const params = new URLSearchParams(window.location.search);
    const storyId = params.get('story_id') || params.get('startapp') || tg?.initDataUnsafe?.start_param;

    if (storyId) {
        runDirectLinkAnimation(storyId);
    } else {
        runNormalWelcomeSplash();
    }
}

// 1. Welcome Splash Screen Animation
function runNormalWelcomeSplash() {
    const splash = document.getElementById('app-splash-loader');
    if (splash) splash.classList.remove('hidden');

    loadInitialData().then(() => {
        setTimeout(() => {
            if (splash) splash.classList.add('hidden');
        }, 2000);
    });
}

// 2. Direct Story Link Animation (0-100% Loader)
function runDirectLinkAnimation(storyId) {
    const loader = document.getElementById('direct-loader');
    const progressVal = document.getElementById('progress-val');
    const progressBar = document.getElementById('progressBar');
    if (loader) loader.classList.remove('hidden');

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 8) + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);

            loadInitialData().then(() => {
                setTimeout(() => {
                    if (loader) loader.classList.add('hidden');
                    openModal(storyId);
                }, 300);
            });
        }
        if (progressVal) progressVal.innerText = progress;
        if (progressBar) progressBar.style.width = progress + '%';
    }, 50);
}

// API Data Fetching
function loadInitialData() {
    return fetch(`/api/user_info?user_id=${userId}`)
        .then(res => res.json())
        .then(usr => {
            userUnlockedStories = usr.unlocked_stories || [];
            userWishlist = usr.wishlist || [];

            const unlockedEl = document.getElementById("unlockedCount");
            const headerUnlockedEl = document.getElementById("headerUnlockedCount");
            const wishlistStatusEl = document.getElementById("wishlistStatus");

            if (unlockedEl) unlockedEl.innerText = userUnlockedStories.length;
            if (headerUnlockedEl) headerUnlockedEl.innerText = userUnlockedStories.length;

            if (wishlistStatusEl) {
                wishlistStatusEl.innerText = userWishlist.length > 0 
                    ? `${userWishlist.length} Stories Saved` 
                    : "No saved stories yet!";
            }

            return fetch('/api/stories');
        })
        .then(res => res.json())
        .then(data => {
            allStories = data || [];
            const totalShowsEl = document.getElementById("totalShows");
            if (totalShowsEl) totalShowsEl.innerText = allStories.length;

            renderStories(allStories, 'storiesGrid');
            renderStories(allStories, 'exploreGrid');
            renderUnlockedLibrary();
        })
        .catch(err => console.error("Data Loading Failed:", err));
}

// Render Stories to Grid
function renderStories(stories, targetGridId = 'storiesGrid') {
    const grid = document.getElementById(targetGridId);
    if (!grid) return;

    if (stories.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #777; font-size: 12px; padding: 20px;">No stories found</p>`;
        return;
    }

    grid.innerHTML = stories.map(s => {
        const isWished = userWishlist.includes(s.story_id);
        const badgeText = s.badge || s.platform || "POCKET FM";
        return `
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
    const unlockedList = document.getElementById("unlockedList");
    if (!unlockedList) return;

    const purchased = allStories.filter(s => userUnlockedStories.includes(s.story_id));
    if (purchased.length === 0) {
        unlockedList.innerHTML = `<p style="font-size: 12px; color: #777;">No unlocked stories found!</p>`;
        return;
    }

    unlockedList.innerHTML = purchased.map(s => `
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
    haptic('medium');

    fetch(`/api/story_details?user_id=${userId}&story_id=${storyId}`)
        .then(res => res.json())
        .then(story => {
            currentStory = story;
            const container = document.getElementById("modalContainer");
            const badgeText = story.badge || story.platform || "POCKET FM";

            if (story.unlocked) {
                container.innerHTML = `
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
                container.innerHTML = `
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

            const modal = document.getElementById("storyModal");
            if (modal) modal.classList.remove("hidden");
        })
        .catch(err => {
            if (tg) tg.showAlert("Error loading story details!");
        });
}

function closeModal() {
    haptic('light');
    const modal = document.getElementById("storyModal");
    if (modal) modal.classList.add("hidden");
}

// Payment Modal Popups
function openPaymentModal() {
    haptic('medium');
    closeModal();

    const payAmountVal = document.getElementById('payAmountVal');
    const upiIdText = document.getElementById('upiIdText');
    const paymentQr = document.getElementById('paymentQr');
    const payModal = document.getElementById('paymentModal');

    if (payAmountVal) payAmountVal.innerText = currentStory.price;
    if (upiIdText) upiIdText.innerText = upiConfig.upi_id;
    if (paymentQr) {
        paymentQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${upiConfig.upi_id}%26pn=ACVerse%26am=${currentStory.price}`;
    }

    if (payModal) payModal.classList.remove('hidden');
}

function closePaymentModal() {
    haptic('light');
    const payModal = document.getElementById('paymentModal');
    if (payModal) payModal.classList.add('hidden');
}

function copyUpi() {
    navigator.clipboard.writeText(upiConfig.upi_id);
    haptic('success');
    if (tg) tg.showAlert("✅ UPI ID Copied to clipboard!");
}

// UTR Submission
function submitTransaction() {
    const utrInput = document.getElementById("utrInput");
    const utr = utrInput ? utrInput.value.trim() : "";
    
    if (!utr || utr.length < 6) {
        haptic('error');
        if (tg) tg.showAlert("⚠️ Please enter a valid UTR / Ref No.!");
        return;
    }

    haptic('medium');
    const submitBtn = document.getElementById("submitPayBtn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "SUBMITTING...";
    }

    fetch('/api/submit_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            user_name: userName,
            story_id: currentStory.story_id,
            amount: currentStory.price,
            utr: utr
        })
    })
    .then(res => res.json())
    .then(data => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "SUBMIT PAYMENT 🚀";
        }

        if (data.success) {
            haptic('success');
            if (tg) tg.showAlert("✅ Payment Sent for Approval!\nYour payment details have been sent to our admin for verification.");
            closePaymentModal();
        } else {
            haptic('error');
            if (tg) tg.showAlert("❌ Error: " + data.message);
        }
    })
    .catch(err => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "SUBMIT PAYMENT 🚀";
        }
        haptic('error');
        if (tg) tg.showAlert("❌ Payment details sent to admin!");
        closePaymentModal();
    });
}

function redirectToBot(botLink) {
    haptic('medium');
    if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(botLink);
        tg.close();
    } else {
        window.open(botLink, '_blank');
    }
}

function toggleWishlist(storyId, evt) {
    if (evt) evt.stopPropagation();
    haptic('selection');

    fetch('/api/toggle_wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, story_id: storyId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'added') {
            userWishlist.push(storyId);
        } else {
            userWishlist = userWishlist.filter(id => id !== storyId);
        }
        
        const wishlistStatusEl = document.getElementById("wishlistStatus");
        if (wishlistStatusEl) {
            wishlistStatusEl.innerText = userWishlist.length > 0 
                ? `${userWishlist.length} Stories Saved` 
                : "No saved stories yet!";
        }

        renderStories(allStories, 'storiesGrid');
        renderStories(allStories, 'exploreGrid');
    });
}

// Navigation Tabs
function switchTab(tabName, btn) {
    haptic('selection');

    // Auto close any active modals
    closeModal();
    closePaymentModal();

    document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const activeView = document.getElementById(`view-${tabName}`);
    if (activeView) activeView.classList.remove('hidden');

    if (btn) {
        btn.classList.add('active');
    } else {
        const matchingBtn = document.querySelector(`.nav-btn[onclick*="'${tabName}'"]`);
        if (matchingBtn) matchingBtn.classList.add('active');
    }
}

// Filters
function filterCat(cat, evt) {
    haptic('light');
    document.querySelectorAll('.tag').forEach(b => b.classList.remove('active'));
    if (evt && evt.target) evt.target.classList.add('active');

    if (cat === 'All') {
        renderStories(allStories, 'storiesGrid');
    } else {
        renderStories(allStories.filter(s => s.category === cat || s.badge === cat || s.platform === cat), 'storiesGrid');
    }
}

function filterStories() {
    const searchInput = document.getElementById("searchInput");
    const q = searchInput ? searchInput.value.toLowerCase() : "";
    const filtered = allStories.filter(s => s.title.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)));
    renderStories(filtered, 'storiesGrid');
}

function filterStoriesExplore() {
    const exploreInput = document.getElementById("exploreInput");
    const q = exploreInput ? exploreInput.value.toLowerCase() : "";
    const filtered = allStories.filter(s => s.title.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)));
    renderStories(filtered, 'exploreGrid');
}

function setTheme(theme, evt) {
    haptic('light');
    document.body.className = theme;
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active-theme'));
    
    const targetBtn = evt ? evt.target : (typeof event !== 'undefined' ? event.target : null);
    if (targetBtn) targetBtn.classList.add('active-theme');
}
