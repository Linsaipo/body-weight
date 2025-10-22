// src/main.js
import { auth, db, ADMIN_EMAIL } from './firebase.js';
import { onAuthStateChanged, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { addRoute, startRouter } from './router.js';
import LoginPage from './pages/LoginPage.js';
import InputPage from './pages/InputPage.js';
import AnalyticsPage from './pages/AnalyticsPage.js';
import ProfilePage from './pages/ProfilePage.js';
import ManagePage from './pages/ManagePage.js';

// routes
addRoute('/login', LoginPage);
addRoute('/input', InputPage);
addRoute('/analytics', AnalyticsPage);
addRoute('/profile', ProfilePage);
addRoute('/manage', ManagePage);

const ctx = { auth, db, ADMIN_EMAIL };

function setUserBadge(user, role) {
  const node = document.getElementById('userBadge');
  if (!node) return;
  node.textContent = user ? `${user.email || '使用者'} · ${role}` : '';
}

// 確保使用者檔案與角色
async function ensureUserProfile(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const base = {
    email: (user.email||'').toLowerCase(),
    displayName: user.displayName || '',
    role: ((user.email||'').toLowerCase()===ADMIN_EMAIL ? 'admin' : 'member'),
    coachEmail: null,
    consent: false,
    createdAt: serverTimestamp(),
    subscription: false
  };
  if (!snap.exists()) {
    await setDoc(ref, base, { merge: true });
    return base;
  }
  const data = snap.data();
  if ((user.email||'').toLowerCase()===ADMIN_EMAIL && data.role!=='admin') {
    await setDoc(ref, { role: 'admin' }, { merge: true });
    data.role = 'admin';
  }
  return data;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setUserBadge(null, '');
    if (location.hash !== '#/login') location.hash = '#/login';
    startRouter(ctx);
    return;
  }
  const profile = await ensureUserProfile(user);
  ctx.user = user;
  ctx.profile = profile;
  setUserBadge(user, profile.role);
  // 預設導向
  if (location.hash === '#/login') location.hash = '#/analytics';
  startRouter(ctx);
});

// 登出快捷（header 右上角）
window.logout = async () => { await signOut(auth); location.hash = '#/login'; };
