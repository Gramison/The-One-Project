/* ] THE ONE - ULTIMATE CORE */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, deleteObject } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

const firebaseConfig = { 
    apiKey: "YOUR_KEY", authDomain: "YOUR_DOMAIN", databaseURL: "YOUR_DB", 
    projectId: "YOUR_ID", storageBucket: "YOUR_BUCKET", messagingSenderId: "YOUR_SENDER", appId: "YOUR_APP" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

let isLogin = true;

// ] Screen Lifecycle
setTimeout(() => {
    onAuthStateChanged(auth, async (user) => {
        document.getElementById('scr-splash').classList.remove('active');
        if (user) {
            document.getElementById('scr-app').classList.add('active');
            initApp(user);
        } else {
            document.getElementById('scr-auth').classList.add('active');
        }
    });
}, 2500);

// ] Ghost Voter Engine
function applyGhostVoter(qId) {
    const targetVotes = Math.floor(Math.random() * (10000 - 1000 + 1)) + 1000;
    let currentVotes = 0;
    const interval = setInterval(() => {
        if (currentVotes >= targetVotes) clearInterval(interval);
        currentVotes += Math.floor(Math.random() * 50);
        // Realtime update logic here
        document.getElementById('count-a').innerText = (currentVotes * 0.87 / 1000).toFixed(1) + "K";
        document.getElementById('count-b').innerText = (currentVotes * 0.13 / 1000).toFixed(1) + "K";
    }, 3000); // 3 saniyede bir oyları arttırarak gerçekçilik sağlar
}

// ] Auth Logic
window.toggleAuth = () => {
    isLogin = !isLogin;
    document.querySelector('.reg-only').style.display = isLogin ? 'none' : 'block';
    document.getElementById('auth-toggle').innerText = isLogin ? 'Henüz bir üyeliğin yok mu? Kayıt Ol' : 'Hesabın var mı? Giriş Yap';
};

window.handleAuth = async () => {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-pass').value;
    const u = document.getElementById('reg-user').value;
    try {
        if (!isLogin) {
            const res = await createUserWithEmailAndPassword(auth, e, p);
            await set(ref(db, `users/${res.user.uid}`), { username: u, credits: 500, following: 0, followers: 0 });
        } else {
            await signInWithEmailAndPassword(auth, e, p);
        }
    } catch (err) { alert(err.message); }
};

// ] Dilemma Submission & Photo Cleanup
window.sendDilemma = async () => {
    const text = document.getElementById('q-text').value;
    const file = document.getElementById('q-file').files[0];
    if(!text) return;

    const qId = Date.now();
    let imgUrl = null;

    if(file) {
        const fileRef = sRef(storage, `dilemmas/${qId}`);
        await uploadBytes(fileRef, file);
        // Fotoğrafı soru kapandığında silmek için referansı saklıyoruz
    }

    alert("İkilemin global topluluğa ve Ghost Voter'lara sunuldu!");
    applyGhostVoter(qId);
};

window.logout = () => signOut(auth);

// ] Navigation System
window.nav = (tab) => {
    document.querySelectorAll('.nav-menu button').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    // Tab geçiş mantığı
};
