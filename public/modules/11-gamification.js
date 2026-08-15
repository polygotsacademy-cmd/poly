/* Polyglots current site — 11-gamification.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

// --- GAMIFICATION SYSTEM ---
let userPoints = 0;
let userStreak = 0;

async function initGamification() {
    if (!currentUser || !currentUser.username) return;

    // Admin accounts never receive or accumulate gamification points.
    if (currentUser.isAdmin === true) {
        userPoints = 0;
        userStreak = 0;
        updatePointsUI();
        return;
    }
    const userRef = db.collection('users').doc(currentUser.username);
    try {
        const doc = await userRef.get();
        const today = new Date().toISOString().split('T')[0];
        
        let points = 0;
        let streak = 1;
        let lastLogin = '';
        
        if (doc.exists) {
            const data = doc.data();
            points = data.points || 0;
            streak = data.streak || 1;
            lastLogin = data.lastLoginDate || '';
        }
        
        // Daily login streak & bonus
        if (lastLogin !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            if (lastLogin === yesterday) {
                streak += 1;
            } else if (lastLogin !== '') {
                streak = 1;
            }
            points += 10; // Daily login bonus XP
            showToast('🎉 مكافأة الدخول اليومي: +10 نقاط! (Streak: ' + streak + ' أيام)', 'success');
            
            await userRef.set({
                points: points,
                streak: streak,
                lastLoginDate: today
            }, { merge: true });
        }
        
        userPoints = points;
        userStreak = streak;
        updatePointsUI();
    } catch (err) {
        console.error("Error initializing gamification:", err);
    }
}

function updatePointsUI() {
    const valEl = document.getElementById('user-points-val');
    if (valEl) {
        valEl.innerText = userPoints;
    }
}

async function awardPoints(pointsToAdd, reason = '') {
    if (!currentUser || !currentUser.username || currentUser.isAdmin === true) return;
    userPoints += pointsToAdd;
    updatePointsUI();
    
    if (reason) {
        showToast(`⭐ +${pointsToAdd} XP (${reason})`, 'success');
    }
    
    try {
        await db.collection('users').doc(currentUser.username).set({
            points: userPoints
        }, { merge: true });
    } catch (err) {
        console.error("Error saving points:", err);
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = 'background: #333; color: #fff; padding: 12px 20px; margin-top: 10px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: "Cairo", sans-serif; font-size: 14px; animation: fadeIn 0.3s ease;';
    toast.innerText = message;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function renderLeaderboardView(container) {
    container.innerHTML = `
        <div class="view-header" style="padding: 20px; text-align: center;">
            <h2 style="color: var(--burgundy-color, #800020); font-family: 'Cairo', sans-serif;"><i class="fas fa-trophy" style="color: #f1c40f;"></i> لوحة الشرف وأبطال الأكاديمية</h2>
            <p style="color: #666; margin-top: 5px;">تنافس مع زملائك واجمع النقاط لتتصدر القائمة!</p>
        </div>
        <div style="max-width: 600px; margin: 0 auto; padding: 0 20px 40px 20px;">
            <div id="leaderboard-list" style="background: white; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #eee;">
                <div style="text-align: center; padding: 30px; color: #888;">جاري تحميل لوحة الشرف... ⏳</div>
            </div>
        </div>
    `;
    
    try {
        const snap = await db.collection('users').orderBy('points', 'desc').limit(20).get();
        const listEl = document.getElementById('leaderboard-list');
        if (!listEl) return;
        
        if (snap.empty) {
            listEl.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">لا توجد بيانات حالياً</div>';
            return;
        }
        
        let html = '';
        let rank = 1;
        snap.forEach(doc => {
            const data = doc.data();
            const username = doc.id;
            const points = data.points || 0;
            const mascot = data.mascot || '👤';
            
            let rankBadgeStyle = 'background: #f0f0f0; color: #333;';
            if (rank === 1) rankBadgeStyle = 'background: #f1c40f; color: #fff; font-weight: bold;';
            else if (rank === 2) rankBadgeStyle = 'background: #bdc3c7; color: #fff; font-weight: bold;';
            else if (rank === 3) rankBadgeStyle = 'background: #e67e22; color: #fff; font-weight: bold;';
            
            const isCurrent = currentUser && currentUser.username === username;
            
            html += `
                <div style="display: flex; align-items: center; padding: 15px 20px; border-bottom: 1px solid #f5f5f5; ${isCurrent ? 'background: #fffdf0;' : ''}">
                    <div style="width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; ${rankBadgeStyle} margin-left: 15px; font-size: 14px;">
                        ${rank}
                    </div>
                    <div style="font-size: 26px; margin-left: 15px; width: 40px; text-align: center;">
                        ${mascot}
                    </div>
                    <div style="flex-grow: 1; font-family: 'Cairo', sans-serif;">
                        <h4 style="margin: 0; color: #333; font-size: 16px;">${username} ${isCurrent ? '<span style="font-size: 11px; background: var(--burgundy-color, #800020); color: white; padding: 2px 8px; border-radius: 10px; margin-right: 8px;">أنت</span>' : ''}</h4>
                    </div>
                    <div style="font-weight: bold; color: #e67e22; font-size: 16px; font-family: 'Nunito', sans-serif;">
                        ⭐ ${points} XP
                    </div>
                </div>
            `;
            rank++;
        });
        
        listEl.innerHTML = html;
    } catch (err) {
        console.error("Error loading leaderboard:", err);
        const listEl = document.getElementById('leaderboard-list');
        if (listEl) {
            listEl.innerHTML = '<div style="text-align: center; padding: 30px; color: red;">حدث خطأ أثناء تحميل لوحة الشرف</div>';
        }
    }
}
// --- END GAMIFICATION SYSTEM ---
