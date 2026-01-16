// ... (Firebase Config kısımları aynı kalacak) ...

// ] 1. SORULARI ÇEKERKEN FİLTRELEME
async function fetchQuestions() {
    if (!userData) return;

    // Tüm soruları getir
    const snap = await db.collection("questions").orderBy("createdAt", "desc").get();
    const now = new Date().getTime();

    allQuestions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(q => {
            // A. KULLANICI DAHA ÖNCE OY VERDİ Mİ?
            const hasVoted = q.votedBy && q.votedBy.includes(auth.currentUser.uid);
            
            // B. SÜRE DOLDU MU? (Varsayılan 24 saat = 86400000 ms)
            const duration = q.duration || 86400000; 
            const isExpired = (now - q.createdAt.toDate().getTime()) > duration;

            // Sadece oy vermediğim ve süresi dolmamış soruları göster
            return !hasVoted && !isExpired;
        });

    currentQIndex = 0;
    displayQuestion();
}

// ] 2. OY VERME VE KAYDETME
async function showStats(q) {
    if(navigator.vibrate) navigator.vibrate(50);

    const qRef = db.collection("questions").doc(q.id);

    try {
        // Firebase'de oy verenler listesine bu kullanıcıyı ekle
        await qRef.update({
            votedBy: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.uid)
        });

        // İstatistikleri simüle et (Gerçek veritabanı sayacı daha sonra eklenecek)
        const p1 = Math.floor(Math.random() * 100);
        document.getElementById('stat-bar-gold').style.width = p1 + "%";
        document.getElementById('txt-1').innerText = q.options[0] + " %" + p1;
        document.getElementById('txt-2').innerText = q.options[1] + " %" + (100-p1);
        document.getElementById('stats-container').style.display = "block";

        // 2 saniye sonra bir sonraki soruya geç
        setTimeout(() => {
            currentQIndex++;
            displayQuestion();
        }, 2000);

    } catch (e) {
        console.error("Oy kaydedilemedi:", e);
    }
}

// ] 3. YENİ SORU EKLEME (Süre eklenmiş hali)
async function submitQuestion() {
    const text = document.getElementById('new-q-text').value;
    // Süre seçimi (Örn: 24 saat)
    const duration = 24 * 60 * 60 * 1000; 

    if(!text) return;

    await db.collection("questions").add({
        text: text,
        options: [document.getElementById('opt-1').value || "EVET", document.getElementById('opt-2').value || "HAYIR"],
        authorName: userData.username,
        owner: auth.currentUser.uid,
        votedBy: [], // Başlangıçta boş liste
        duration: duration,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    closeAskModal();
    fetchQuestions();
}
