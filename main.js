import { auth, db, ADMIN_EMAIL } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { addRoute, startRouter } from './router.js';

// 一定要全小寫檔名 & 相對路徑
import LoginPage       from './pages/loginpage.js';
import InputPage       from './pages/inputpage.js';
import AnalyticsPage   from './pages/analyticspage.js';
import ProfilePage     from './pages/profilepage.js';
import ManagePage      from './pages/managepage.js';
import AdminRolesPage  from './pages/adminrolespage.js';

// 註冊路由
addRoute('/login',     LoginPage);
addRoute('/input',     InputPage);
addRoute('/analytics', AnalyticsPage);
addRoute('/profile',   ProfilePage);
addRoute('/manage',    ManagePage);
addRoute('/roles',     AdminRolesPage);

const ctx = { auth, db, ADMIN_EMAIL };

function setUserBadge(user, role) {
  const node = document.getElementById('userBadge');
  const logoutBtn = document.getElementById('btnLogout');
  if (node)     node.textContent = user ? `${user.email || '使用者'} · ${role}` : '';
  if (logoutBtn) logoutBtn.classList.toggle('hidden', !user); // 登入才顯示「登出」
}

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

  // 登入後若還在 login 或沒有 hash，導到輸入頁
  if (location.hash === '#/login' || !location.hash) {
    location.hash = '#/input';
  }

  startRouter(ctx);
});

// 登出
window.logout = async () => {
  await signOut(auth);
  location.hash = '#/login';
};