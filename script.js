// ] THE ONE - ULTIMATE PRODUCTION CORE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    onValue, 
    update,
    push,
    query,
    orderByChild,
    limitToFirst,
    serverTimestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { 
    getStorage, 
    ref as sRef, 
    uploadBytes, 
    deleteObject,
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";
import { 
    getMessaging, 
    getToken, 
    onMessage 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js";

// Firebase Configuration (Kullanıcı Bilgileri ile Güncellendi)
const firebaseConfig = {
    apiKey: "AIzaSyAowX4bFjBGFSDK7OSzkvm5GEXHZu7PT-4",
    authDomain: "the-one-940d8.firebaseapp.com",
    projectId: "the-one-940d8",
    storageBucket: "the-one-940d8.firebasestorage.app",
    messagingSenderId: "681329514342",
    appId: "1:681329514342:web:7b347513c444fa41351aa7",
    measurementId: "G-WVN6B0DPRR",
    databaseURL: "https://the-one-940d8-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

// Global State
let currentUser = null;
let currentUserData = null;
let isLogin = true;
let ghostIntervals = new Map();
let fcmToken = null;

// ] Screen Management
setTimeout(() => {
    onAuthStateChanged(auth, async (user) => {
        document.getElementById('scr-splash').classList.remove('active');
        if (user) {
            currentUser = user;
            await loadUserData();
            document.getElementById('scr-app').classList.add('active');
            initializeFCM();
            loadFeed();
        } else {
            document.getElementById('scr-auth').classList.add('active');
        }
    });
}, 2000);

// ] Ghost Voter Engine - Realistic Time Distribution
function startGhostVoter(dilemmaId, realVotesA, realVotesB) {
    // Prevent duplicate intervals
    if (ghostIntervals.has(dilemmaId)) return;
    
    const totalReal = realVotesA + realVotesB || 1;
    const ratioA = realVotesA / totalReal;
    const ratioB = realVotesB / totalReal;
    
    // Random target between 1000-10000
    const targetTotal = Math.floor(Math.random() * 9000) + 1000;
    const targetA = Math.floor(targetTotal * ratioA);
    const targetB = Math.floor(targetTotal * ratioB);
    
    let currentA = realVotesA;
    let currentB = realVotesB;
    let step = 0;
    
    // Realistic distribution over 30-90 seconds
    const duration = Math.floor(Math.random() * 60000) + 30000; // 30-90s
    const intervalTime = 3000; // Update every 3 seconds
    
    const interval = setInterval(async () => {
        step++;
        const progress = step / (duration / intervalTime);
        
        if (progress >= 1) {
            clearInterval(interval);
            ghostIntervals.delete(dilemmaId);
            return;
        }
        
        // Smooth non-linear growth
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
        currentA = Math.floor(realVotesA + (targetA - realVotesA) * easeProgress);
        currentB = Math.floor(realVotesB + (targetB - realVotesB) * easeProgress);
        
        // Update UI
        updateVoteDisplay(dilemmaId, currentA, currentB);
        
        // Update Firebase (safely)
        update(ref(db, `dilemmas/${dilemmaId}/ghostVotes`), {
            a: currentA - realVotesA,
            b: currentB - realVotesB,
            updatedAt: Date.now()
        });
        
    }, intervalTime);
    
    ghostIntervals.set(dilemmaId, interval);
}

function updateVoteDisplay(dilemmaId, votesA, votesB) {
    const card = document.querySelector(`[data-dilemma-id="${dilemmaId}"]`);
    if (!card) return;
    
    const total = votesA + votesB || 1;
    const pctA = (votesA / total * 100).toFixed(1);
    const pctB = (votesB / total * 100).toFixed(1);
    
    const barA = card.querySelector('#bar-a');
    const barB = card.querySelector('#bar-b');
    const countA = card.querySelector('#count-a');
    const countB = card.querySelector('#count-b');
    
    if (barA) barA.style.width = `${pctA}%`;
    if (barB) barB.style.width = `${pctB}%`;
    if (countA) countA.textContent = formatNumber(votesA);
    if (countB) countB.textContent = formatNumber(votesB);
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// ] Authentication System
window.toggleAuth = () => {
    isLogin = !isLogin;
    const regInput = document.getElementById('reg-user');
    const toggleText = document.getElementById('auth-toggle');
    
    if (isLogin) {
        regInput.style.display = 'none';
        regInput.required = false;
        toggleText.textContent = 'Henüz bir üyeliğin yok mu? Kayıt Ol';
    } else {
        regInput.style.display = 'block';
        regInput.required = true;
        toggleText.textContent = 'Hesabın var mı? Giriş Yap';
    }
};

window.handleAuth = async () => {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-pass').value;
    const username = document.getElementById('reg-user').value.trim();
    
    if (!email || !password || (!isLogin && !username)) {
        showNotification('Tüm alanları doldurun!', 'error');
        return;
    }
    
    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Create user profile
            await set(ref(db, `users/${user.uid}`), {
                username: username,
                email: email,
                credits: 500,
                following: 0,
                followers: 0,
                createdAt: serverTimestamp(),
                lastActive: serverTimestamp()
            });
            
            // Initialize following/followers lists
            await set(ref(db, `social/${user.uid}/following`), {});
            await set(ref(db, `social/${user.uid}/followers`), {});
            
            // Update display name
            await updateProfile(user, { displayName: username });
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

window.logout = async () => {
    try {
        // Cleanup ghost intervals
        ghostIntervals.forEach(interval => clearInterval(interval));
        ghostIntervals.clear();
        
        await signOut(auth);
        document.getElementById('scr-app').classList.remove('active');
        document.getElementById('scr-auth').classList.add('active');
    } catch (error) {
        showNotification('Çıkış hatası!', 'error');
    }
};

// ] Load User Data
async function loadUserData() {
    const userRef = ref(db, `users/${currentUser.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
        currentUserData = snapshot.val();
        
        // Update UI
        document.getElementById('user-credits').textContent = currentUserData.credits || 0;
        document.getElementById('shop-credits').textContent = currentUserData.credits || 0;
        
        // Profile tab data
        document.getElementById('profile-username').textContent = `@${currentUserData.username}`;
        document.getElementById('profile-initial').textContent = currentUserData.username.charAt(0).toUpperCase();
        document.getElementById('profile-following').textContent = currentUserData.following || 0;
        document.getElementById('profile-followers').textContent = currentUserData.followers || 0;
    }
}

// ] Navigation System
function navTab(tab) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`nav-${tab}`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('tab-active'));
    document.getElementById(`tab-${tab}`).classList.add('tab-active');
    
    // Load tab-specific data
    switch(tab) {
        case 'feed':
            loadFeed();
            break;
        case 'explore':
            loadExplore();
            break;
        case 'profile':
            loadProfile();
            break;
    }
}

// ] Dilemma Creation with Media
window.sendDilemma = async () => {
    const text = document.getElementById('q-text').value.trim();
    const file = document.getElementById('q-file').files[0];
    
    if (!text) {
        showNotification('İkilem metni boş olamaz!', 'error');
        return;
    }
    
    if (!currentUser) {
        showNotification('Giriş yapmalısınız!', 'error');
        return;
    }
    
    try {
        showNotification('İkilem yayımlanıyor...', 'info');
        const dilemmaId = push(ref(db, 'dilemmas')).key;
        let mediaUrl = null;
        let mediaType = null;
        
        if (file) {
            const fileRef = sRef(storage, `dilemmas/${dilemmaId}/${file.name}`);
            await uploadBytes(fileRef, file);
            mediaUrl = await getDownloadURL(fileRef);
            mediaType = file.type.startsWith('video/') ? 'video' : 'image';
        }
        
        const dilemmaData = {
            id: dilemmaId,
            text: text,
            userId: currentUser.uid,
            username: currentUserData.username,
            createdAt: serverTimestamp(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            votes: { a: 0, b: 0 },
            ghostVotes: { a: 0, b: 0 },
            voters: {},
            totalVotes: 0
        };
        
        await set(ref(db, `dilemmas/${dilemmaId}`), dilemmaData);
        
        // Update user dilemma count
        await update(ref(db, `users/${currentUser.uid}`), {
            lastActive: serverTimestamp(),
            dilemmas: (currentUserData.dilemmas || 0) + 1
        });
        
        // Reset form
        document.getElementById('q-text').value = '';
        document.getElementById('q-file').value = '';
        
        showNotification('İkilem global topluluğa sunuldu!', 'success');
        
        // Load updated feed
        setTimeout(() => loadFeed(), 500);
        
    } catch (error) {
        showNotification('Hata: ' + error.message, 'error');
    }
};

// ] Feed Loading with Real-time Updates
async function loadFeed() {
    const feedContainer = document.getElementById('feed-container');
    feedContainer.innerHTML = '<div class="main-loader"></div>';
    
    try {
        const dilemmasRef = ref(db, 'dilemmas');
        const recentQuery = query(dilemmasRef, orderByChild('createdAt'), limitToFirst(20));
        
        onValue(recentQuery, (snapshot) => {
            feedContainer.innerHTML = '';
            const dilemmas = [];
            
            snapshot.forEach(child => {
                dilemmas.unshift(child.val()); // Reverse to show newest first
            });
            
            dilemmas.forEach(dilemma => {
                const card = createDilemmaCard(dilemma);
                feedContainer.appendChild(card);
                
                // Start Ghost Voter if needed
                if (dilemma.totalVotes < 1000 && !ghostIntervals.has(dilemma.id)) {
                    setTimeout(() => {
                        startGhostVoter(dilemma.id, dilemma.votes.a, dilemma.votes.b);
                    }, Math.random() * 5000); // Random delay for realism
                }
            });
        }, { onlyOnce: true });
        
        // Listen for new dilemmas
        onValue(dilemmasRef, (snapshot) => {
            snapshot.forEach(child => {
                const dilemma = child.val();
                if (dilemma.expiresAt < Date.now()) {
                    // Auto-cleanup expired media
                    cleanupMedia(dilemma);
                }
            });
        });
        
    } catch (error) {
        showNotification('Akış yüklenemedi!', 'error');
    }
}

function createDilemmaCard(dilemma) {
    const card = document.createElement('div');
    card.className = 'dilemma-card premium-border';
    card.setAttribute('data-dilemma-id', dilemma.id);
    
    const totalVotes = (dilemma.votes.a + dilemma.votes.b) + (dilemma.ghostVotes.a + dilemma.ghostVotes.b || 0);
    const pctA = totalVotes > 0 ? ((dilemma.votes.a + dilemma.ghostVotes.a) / totalVotes * 100).toFixed(1) : 50;
    const pctB = totalVotes > 0 ? ((dilemma.votes.b + dilemma.ghostVotes.b) / totalVotes * 100).toFixed(1) : 50;
    
    // Calculate time left
    const timeLeft = Math.max(0, Math.floor((dilemma.expiresAt - Date.now()) / 1000));
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    card.innerHTML = `
        <div class="card-header">
            <span class="user-tag" onclick="viewProfile('${dilemma.userId}')">@${dilemma.username}</span>
            <span class="timer">${timeText}</span>
        </div>
        ${dilemma.mediaType === 'image' ? `<div class="media-container"><img src="${dilemma.mediaUrl}" alt="Dilemma Media"></div>` : ''}
        ${dilemma.mediaType === 'video' ? `<div class="media-container"><video src="${dilemma.mediaUrl}" controls></video></div>` : ''}
        <p class="question-txt">${escapeHtml(dilemma.text)}</p>
        <div class="vote-engine">
            <div class="v-option" onclick="castVote('${dilemma.id}', 'a')">
                <div class="v-progress" id="bar-a" style="width: ${pctA}%"></div>
                <span class="v-label">EVET</span>
                <span class="v-count" id="count-a">${formatNumber(dilemma.votes.a + dilemma.ghostVotes.a)}</span>
            </div>
            <div class="v-option" onclick="castVote('${dilemma.id}', 'b')">
                <div class="v-progress" id="bar-b" style="width: ${pctB}%"></div>
                <span class="v-label">HAYIR</span>
                <span class="v-count" id="count-b">${formatNumber(dilemma.votes.b + dilemma.ghostVotes.b)}</span>
            </div>
        </div>
    `;
    
    return card;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ] Vote Casting with Anti-Fraud
async function castVote(dilemmaId, option) {
    if (!currentUser) {
        showNotification('Oylamak için giriş yapın!', 'error');
        return;
    }
    
    try {
        const dilemmaRef = ref(db, `dilemmas/${dilemmaId}`);
        const voterKey = `voters/${currentUser.uid}`;
        
        // Check if already voted using transaction
        await runTransaction(dilemmaRef, (dilemma) => {
            if (!dilemma) return null;
            
            if (dilemma.voters && dilemma.voters[currentUser.uid]) {
                throw new Error('Zaten oy verdiniz!');
            }
            
            dilemma.votes[option]++;
            dilemma.totalVotes++;
            
            if (!dilemma.voters) dilemma.voters = {};
            dilemma.voters[currentUser.uid] = {
                option: option,
                timestamp: Date.now()
            };
            
            return dilemma;
        });
        
        showNotification('Oy verildi!', 'success');
        
        // Send notification to author if following
        const dilemmaSnapshot = await get(dilemmaRef);
        if (dilemmaSnapshot.exists()) {
            const dilemma = dilemmaSnapshot.val();
            checkAndSendNotification(dilemma.userId, `${currentUserData.username} senin ikilemine oy verdi!`);
        }
        
    } catch (error) {
        if (error.message === 'Zaten oy verdiniz!') {
            showNotification('Bu ikileme zaten oy verdiniz!', 'error');
        } else {
            showNotification('Oy hatası: ' + error.message, 'error');
        }
    }
}

// ] Follow/Unfollow System
async function toggleFollow(targetUserId) {
    if (!currentUser || targetUserId === currentUser.uid) return;
    
    const followingRef = ref(db, `social/${currentUser.uid}/following/${targetUserId}`);
    const followersRef = ref(db, `social/${targetUserId}/followers/${currentUser.uid}`);
    
    try {
        const isFollowing = await get(followingRef);
        
        if (isFollowing.exists()) {
            // Unfollow
            await set(followingRef, null);
            await set(followersRef, null);
            
            // Update counts
            await update(ref(db, `users/${currentUser.uid}`), { following: (currentUserData.following || 1) - 1 });
            await update(ref(db, `users/${targetUserId}`), { followers: (currentUserData.followers || 1) - 1 });
            
            showNotification('Takipten çıkıldı!', 'info');
        } else {
            // Follow
            await set(followingRef, { timestamp: Date.now() });
            await set(followersRef, { timestamp: Date.now() });
            
            // Update counts
            await update(ref(db, `users/${currentUser.uid}`), { following: (currentUserData.following || 0) + 1 });
            await update(ref(db, `users/${targetUserId}`), { followers: (currentUserData.followers || 0) + 1 });
            
            showNotification('Takip ediliyor!', 'success');
        }
        
        // Reload data
        await loadUserData();
        loadProfile(targetUserId);
        
    } catch (error) {
        showNotification('Takip hatası: ' + error.message, 'error');
    }
}

// ] Profile Loading
async function loadProfile(userId = null) {
    const targetId = userId || currentUser.uid;
    const isOwnProfile = targetId === currentUser.uid;
    
    try {
        const userRef = ref(db, `users/${targetId}`);
        const socialRef = ref(db, `social/${targetId}`);
        const dilemmasRef = ref(db, 'dilemmas');
        
        const [userSnap, socialSnap] = await Promise.all([
            get(userRef),
            get(socialRef)
        ]);
        
        if (!userSnap.exists()) {
            showNotification('Kullanıcı bulunamadı!', 'error');
            return;
        }
        
        const userData = userSnap.val();
        const isFollowing = socialSnap.exists() && socialSnap.val().followers && socialSnap.val().followers[currentUser.uid];
        
        // Update profile header
        document.getElementById('profile-dilemmas').textContent = userData.dilemmas || 0;
        
        if (!isOwnProfile) {
            document.getElementById('profile-username').textContent = `@${userData.username}`;
            document.getElementById('profile-initial').textContent = userData.username.charAt(0).toUpperCase();
            document.getElementById('profile-following').textContent = userData.following || 0;
            document.getElementById('profile-followers').textContent = userData.followers || 0;
        }
        
        // Add follow button if not own profile
        const followBtn = document.createElement('button');
        followBtn.className = `follow-btn ${isFollowing ? 'following' : ''}`;
        followBtn.textContent = isFollowing ? 'TAKİP EDİLİYOR' : 'TAKİP ET';
        followBtn.onclick = () => toggleFollow(targetId);
        
        const profileHeader = document.querySelector('.profile-header');
        const existingBtn = profileHeader.querySelector('.follow-btn');
        if (!isOwnProfile) {
            if (existingBtn) existingBtn.remove();
            profileHeader.appendChild(followBtn);
        } else if (existingBtn) {
            existingBtn.remove();
        }
        
        // Load user's dilemmas
        const userDilemmas = [];
        const allDilemmas = await get(dilemmasRef);
        
        allDilemmas.forEach(child => {
            const dilemma = child.val();
            if (dilemma.userId === targetId) {
                userDilemmas.push(dilemma);
            }
        });
        
        const container = document.getElementById('profile-dilemmas-container');
        container.innerHTML = '';
        
        if (userDilemmas.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">Henüz ikilem yok.</p>';
        } else {
            userDilemmas.forEach(dilemma => {
                container.appendChild(createDilemmaCard(dilemma));
            });
        }
        
    } catch (error) {
        showNotification('Profil yüklenemedi: ' + error.message, 'error');
    }
}

function viewProfile(userId) {
    navTab('profile');
    loadProfile(userId);
}

// ] Explore Tab
async function loadExplore() {
    const container = document.getElementById('explore-container');
    container.innerHTML = '<div class="main-loader"></div>';
    
    try {
        const usersRef = ref(db, 'users');
        const usersSnap = await get(usersRef);
        
        container.innerHTML = '';
        const users = [];
        
        usersSnap.forEach(child => {
            if (child.key !== currentUser.uid) {
                users.push({ id: child.key, ...child.val() });
            }
        });
        
        // Show top creators
        users.sort((a, b) => (b.followers || 0) - (a.followers || 0));
        
        users.slice(0, 10).forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'dilemma-card premium-border p-4 cursor-pointer';
            userCard.onclick = () => viewProfile(user.id);
            
            userCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="profile-avatar w-12 h-12 rounded-full bg-gold flex items-center justify-center text-black font-bold">
                            ${user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 class="font-bold text-gold">@${user.username}</h3>
                            <p class="text-xs text-gray-500">${user.followers || 0} takipçi</p>
                        </div>
                    </div>
                    <button class="follow-btn" onclick="event.stopPropagation(); toggleFollow('${user.id}')">TAKİP ET</button>
                </div>
            `;
            
            container.appendChild(userCard);
        });
        
    } catch (error) {
        showNotification('Keşif yüklenemedi!', 'error');
    }
}

// ] Shop & Credits
window.purchaseItem = async (item) => {
    const credits = currentUserData.credits || 0;
    
    if (item === 'premium') {
        if (credits < 2999) {
            showNotification('Yeterli kredi yok! (Gerekli: 2999)', 'error');
            return;
        }
        await update(ref(db, `users/${currentUser.uid}`), { 
            premium: true,
            credits: credits - 2999 
        });
        showNotification('Premium üyelik aktif!', 'success');
    } else if (item === 'credits') {
        // Simulate purchase
        showNotification('Kredi satın alma simüle edildi!', 'success');
    }
    
    await loadUserData();
};

// ] Firebase Cloud Messaging - Push Notifications
async function initializeFCM() {
    if (!currentUser) return;
    
    try {
        const token = await getToken(messaging, { 
            vapidKey: 'YOUR_VAPID_KEY' // Replace with your VAPID key from Firebase Console
        });
        
        if (token) {
            fcmToken = token;
            // Save token to user profile
            await update(ref(db, `users/${currentUser.uid}`), {
                fcmToken: token,
                lastTokenUpdate: Date.now()
            });
            
            // Listen for messages
            onMessage(messaging, (payload) => {
                showNotification(payload.notification.body, 'info');
            });
        }
    } catch (error) {
        console.log('FCM Hatası (Bildirimler kapalı olabilir):', error);
    }
}

// ] Notification System
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Remove existing classes
    notification.classList.remove('error', 'success', 'info');
    notification.classList.add(type);
    
    // Show notification
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// ] Media Cleanup Simulation (Firebase Function yerine)
async function cleanupMedia(dilemma) {
    if (dilemma.mediaUrl && (dilemma.expiresAt < Date.now() || dilemma.totalVotes > 10000)) {
        try {
            const mediaRef = sRef(storage, dilemma.mediaUrl);
            await deleteObject(mediaRef);
            
            // Remove media URL from database
            await update(ref(db, `dilemmas/${dilemma.id}`), {
                mediaUrl: null,
                mediaType: null,
                cleanedAt: Date.now()
            });
            
            console.log(`Media cleaned for dilemma: ${dilemma.id}`);
        } catch (error) {
            console.log(`Media cleanup failed for ${dilemma.id}:`, error);
        }
    }
}

// ] Profile Edit (Minimal Implementation)
window.editProfile = () => {
    showNotification('Profil düzenleme yakında!', 'info');
};

// ] Utility: Check and Send Notification
async function checkAndSendNotification(userId, message) {
    if (!currentUser || userId === currentUser.uid) return;
    
    const userRef = ref(db, `users/${userId}`);
    const userSnap = await get(userRef);
    
    if (userSnap.exists()) {
        const userData = userSnap.val();
        const isFollowing = userData.followers && userData.followers[currentUser.uid];
        
        if (isFollowing && userData.fcmToken) {
            // Simulate FCM send (requires server-side or Cloud Function)
            console.log(`[FCM] Would send to ${userData.username}: ${message}`);
            // In production: Call your Cloud Function to send FCM
        }
    }
}

// ] Prevent Navigation Errors
window.addEventListener('beforeunload', () => {
    ghostIntervals.forEach(interval => clearInterval(interval));
    ghostIntervals.clear();
});

// ] Capacitor App Integration
if (window.Capacitor) {
    const { App } = window.Capacitor.Plugins;
    
    App.addListener('appStateChange', async ({ isActive }) => {
        if (isActive && currentUser) {
            await update(ref(db, `users/${currentUser.uid}`), {
                lastActive: Date.now()
            });
        }
    });
    
    App.addListener('backButton', () => {
        // Customize back button behavior
        if (document.querySelector('.tab-content.tab-active') !== document.getElementById('tab-feed')) {
            navTab('feed');
        } else {
            window.history.back();
        }
    });
}
