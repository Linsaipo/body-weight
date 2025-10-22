// src/router.js
const routes = new Map();

export function addRoute(path, loader) {
  routes.set(path, loader);
}

export async function navigate(hash, ctx) {
  const path = (hash || location.hash || '#/login').replace('#', '');
  const [clean] = path.split('?');
  const loader = routes.get(clean) || routes.get('/login');
  const container = document.getElementById('app');
  container.innerHTML = '<div class="py-16 text-center text-slate-500">載入中…</div>';
  const view = await loader(ctx);
  container.innerHTML = '';
  container.appendChild(view);
}

export function startRouter(ctx) {
  window.addEventListener('hashchange', () => navigate(location.hash, ctx));
  if (!location.hash) location.hash = '#/login';
  navigate(location.hash, ctx);
}
