/* Polyglots current site — 10-mascots.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

// --- MASCOT LOGIC ---
const emojis = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋'];

function openMascotModal() {
    const modal = document.getElementById('mascot-modal');
    const grid = document.getElementById('mascot-grid');
    if (modal && grid) {
        if (grid.innerHTML === '') {
            emojis.forEach(emoji => {
                let btn = document.createElement('div');
                btn.className = 'mascot-btn';
                btn.innerText = emoji;
                btn.onclick = () => selectMascot(emoji);
                grid.appendChild(btn);
            });
        }
        modal.style.display = 'block';
    }
}

function closeMascotModal() {
    const modal = document.getElementById('mascot-modal');
    if (modal) modal.style.display = 'none';
}

function selectMascot(emoji) {
    const mascotSpan = document.getElementById('user-mascot');
    if (mascotSpan) mascotSpan.innerText = emoji;
    closeMascotModal();
    
    if (currentUser && currentUser.username) {
        db.collection('users').doc(currentUser.username).set({ mascot: emoji }, { merge: true })
        .catch(err => console.error("Error saving mascot:", err));
    }
}

function loadUserMascot() {
    if (currentUser && currentUser.username) {
        db.collection('users').doc(currentUser.username).get().then(doc => {
            if (doc.exists && doc.data().mascot) {
                const mascotSpan = document.getElementById('user-mascot');
                if (mascotSpan) mascotSpan.innerText = doc.data().mascot;
            }
        }).catch(err => console.error("Error loading mascot:", err));
    }
}

function loadAdminMascots(studentsList) {
    if (!studentsList || studentsList.length === 0) return;
    
    studentsList.forEach(student => {
        db.collection('users').doc(student).get().then(doc => {
            if (doc.exists && doc.data().mascot) {
                window.mascotCache[student] = doc.data().mascot;
                const avatarEl = document.getElementById(`avatar-${student}`);
                if (avatarEl) {
                    avatarEl.innerText = doc.data().mascot;
                }
            }
        }).catch(err => console.error("Error loading student mascot:", err));
    });
}
