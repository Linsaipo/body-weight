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

// ✅ 檔名與路徑請全部小寫，且與 /pages 內檔名一致
import LoginPage       from './pages/loginpage.js';
import InputPage       from './pages/inputpage.js';
import AnalyticsPage   from './pages/analyticspage.js';
import ProfilePage     from './pages/profilepage.js';
import ManagePage      from './pages/managepage.js';
import AdminRolesPage  from './pages/adminrolespage.js';

// 註冊路由
addRoute('/roles',     AdminRolesPage);
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
    // 未登入 → 一律去 login
    if (location.hash !== '#/login') location.hash = '#/login';
    startRouter(ctx);
    return;
  }

  const profile = await ensureUserProfile(user);
  ctx.user = user;
  ctx.profile = profile;

  setUserBadge(user, profile.role);

  // 顯示 / 隱藏「權限管理」連結（只有 admin 看得到）
  const navRoles = document.getElementById('navRoles');
  if (navRoles) {
    navRoles.classList[profile.role === 'admin' ? 'remove' : 'add']('hidden');
  }

  // 路由保護：非 admin 不可留在 /roles
  if (location.hash === '#/roles' && profile.role !== 'admin') {
    location.hash = '#/analytics';
  }

  // 預設導向：登入後如果還在 login，就去輸入頁
  if (location.hash === '#/login') location.hash = '#/input';

  startRouter(ctx);
});

// 登出（header 右上角可綁定 onclick="logout()"）
window.logout = async () => {
  await signOut(auth);
  location.hash = '#/login';
};