// main.js（放在專案根目錄）

import { auth, db, ADMIN_EMAIL } from './firebase.js';
import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

import { addRoute, startRouter } from './router.js';

// ✅ 路徑與檔名「全部用小寫」並且是相對路徑
import LoginPage     from './pages/login.js';
import InputPage     from './pages/input.js';
import AnalyticsPage from './pages/charts.js';   // 你的「圖表/歷史」頁
import ProfilePage   from './pages/profile.js';
import ManagePage    from './pages/admin.js';    // 教練/Admin 管理頁

// 註冊路由
addRoute('/login',     LoginPage);
addRoute('/input',     InputPage);
addRoute('/analytics', AnalyticsPage);
addRoute('/profile',   ProfilePage);
addRoute('/manage',    ManagePage);

const ctx = { auth, db, ADMIN_EMAIL };

function setUserBadge(user, role) {
  const node = document.getElementById('userBadge');
  if (!node) return;
  node.textContent = user ? `${user.email || '使用者'} · ${role}` : '';
}

// 建立/同步使用者檔案與角色
async function ensureUserProfile(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  const base = {
    email: (user.email || '').toLowerCase(),
    displayName: user.displayName || '',
    role: ((user.email || '').toLowerCase() === ADMIN_EMAIL ? 'admin' : 'member'),
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
  // 若後來把 email 設成 admin，也自動升級角色
  if ((user.email || '').toLowerCase() === ADMIN_EMAIL && data.role !== 'admin') {
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

  // 預設導向（登入後若還在 login，就導到 analytics）
  if (location.hash === '#/login') location.hash = '#/analytics';

  startRouter(ctx);
});

// 登出（header 右上角可綁定 onclick="logout()"）
window.logout = async () => {
  await signOut(auth);
  location.hash = '#/login';
};