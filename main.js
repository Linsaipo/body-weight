// main.js
import { auth, db, ADMIN_EMAIL } from './firebase.js';
import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

import { addRoute, startRouter } from './router.js';

// 你的頁面（保持你目前檔名的小寫）
import LoginPage        from './pages/loginpage.js';
import InputPage        from './pages/inputpage.js';
import AnalyticsPage    from './pages/analyticspage.js';
import ProfilePage      from './pages/profilepage.js';
import ManagePage       from './pages/managepage.js';
import AdminRolesPage   from './pages/adminrolespage.js';

// 註冊路由
addRoute('/login',     LoginPage);
addRoute('/input',     InputPage);
addRoute('/analytics', AnalyticsPage);
addRoute('/profile',   ProfilePage);
addRoute('/manage',    ManagePage);
addRoute('/roles',     AdminRolesPage); // 只有 admin 看得到連結，但直接輸入網址也會在頁面內做守門

const ctx = { auth, db, ADMIN_EMAIL };

function setUserHeader(user, role) {
  const badge = document.getElementById('userBadge');
  const btn   = document.getElementById('logoutBtn');
  const navRoles = document.getElementById('navRoles');

  if (user) {
    const name = user.displayName || user.email || '使用者';
    if (badge)   badge.textContent = `${name} / ${role}`;
    if (btn)     btn.classList.remove('hidden');
    if (navRoles) {
      if (role === 'admin') navRoles.classList.remove('hidden');
      else navRoles.classList.add('hidden');
    }
  } else {
    if (badge)   badge.textContent = '';
    if (btn)     btn.classList.add('hidden');
    if (navRoles) navRoles.classList.add('hidden');
  }
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
    setUserHeader(null, '');
    if (location.hash !== '#/login') location.hash = '#/login';
    startRouter(ctx);
    return;
  }

  const profile = await ensureUserProfile(user);
  ctx.user = user;
  ctx.profile = profile;

  setUserHeader(user, profile.role);

  // 登入後預設導到 /input
  if (location.hash === '#/login' || location.hash === '' || location.hash === '#/') {
    location.hash = '#/input';
  }

  startRouter(ctx);
});


window.logout = async () => {
  await signOut(auth);
  location.hash = '#/login';
  setTimeout(() => location.reload(), 30);
};