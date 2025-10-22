// /main.js
import { auth, db, ADMIN_EMAIL } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { addRoute, startRouter } from './router.js';

// 路徑全部小寫
import LoginPage        from './pages/loginpage.js';
import InputPage        from './pages/inputpage.js';
import AnalyticsPage    from './pages/analyticspage.js';
import ProfilePage      from './pages/profilepage.js';
import ManagePage       from './pages/managepage.js';
import AdminRolesPage   from './pages/adminrolespage.js';

addRoute('/roles',     AdminRolesPage);
addRoute('/login',     LoginPage);
addRoute('/input',     InputPage);
addRoute('/analytics', AnalyticsPage);
addRoute('/profile',   ProfilePage);
addRoute('/manage',    ManagePage);

const ctx = { auth, db, ADMIN_EMAIL };

function setUserBadge(user, role) {
  const node = document.getElementById('userBadge');
  if (node) node.textContent = user ? `${user.email || '使用者'} · ${role}` : '';
}

async function ensureUserProfile(user) {
  const ref  = doc(db, 'users', user.uid);
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
  if (!snap.exists()) { await setDoc(ref, base, { merge: true }); return base; }

  const data = snap.data();
  if ((user.email || '').toLowerCase() === ADMIN_EMAIL && data.role !== 'admin') {
    await setDoc(ref, { role: 'admin' }, { merge: true });
    data.role = 'admin';
  }
  return data;
}

onAuthStateChanged(auth, async (user) => {
  const navRoles = document.getElementById('navRoles');

  if (!user) {
    setUserBadge(null, '');
    if (navRoles) navRoles.classList.add('hidden');
    if (location.hash !== '#/login') location.hash = '#/login';
    startRouter(ctx);
    return;
  }

  const profile = await ensureUserProfile(user);
  ctx.user = user;
  ctx.profile = profile;

  setUserBadge(user, profile.role);
  if (navRoles) {
    if (profile.role === 'admin') navRoles.classList.remove('hidden');
    else navRoles.classList.add('hidden');
  }

  // 非 admin 強打 /roles → 導回
  if (location.hash === '#/roles' && profile.role !== 'admin') {
    location.hash = '#/analytics';
  }

  // 登入後如果仍在 login → 導到 /input
  if (location.hash === '#/login') {
    location.hash = '#/input';
  }

  startRouter(ctx);
});

window.logout = async () => {
  await signOut(auth);
  location.hash = '#/login';
};