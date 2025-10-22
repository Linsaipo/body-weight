// router.js
const routes = new Map();

export function addRoute(path, mod) {
  routes.set(path, mod);
}

export function startRouter(ctx) {
  window.removeEventListener('hashchange', _onChange); // 避免重綁
  window.addEventListener('hashchange', _onChange);
  _render(ctx);
}

function _onChange() {
  // 這裡只負責觸發，真正的 ctx 在 startRouter 時帶入
  // ctx 由 _render 內部保存
}

let _lastCtx = null;

async function _render(ctx) {
  _lastCtx = ctx;

  const app = document.getElementById('app');
  if (!app) return;

  let path = (location.hash || '').replace(/^#/, '');
  if (!path || path === '/') {
    // 沒有 hash，預設導到輸入頁
    path = '/input';
    location.replace('#' + path);
  }

  const mod = routes.get(path);

  // 切換 admin 導覽（權限管理）
  const navRoles = document.getElementById('navRoles');
  navRoles?.classList.toggle('hidden', !(ctx?.profile?.role === 'admin'));

  if (!mod) {
    app.innerHTML = `
      <div class="p-10 text-center text-slate-500">
        找不到頁面：<span class="font-mono">${path}</span>
      </div>`;
    console.warn('[router] no route for', path, 'available:', Array.from(routes.keys()));
    return;
  }

  try {
    const html = (typeof mod.render === 'function')
      ? await mod.render(ctx)
      : (mod.html || '');

    app.innerHTML = html || '';

    if (typeof mod.mount === 'function') {
      await mod.mount(ctx, app);
    }
  } catch (err) {
    console.error('[router] render failed:', err);
    app.innerHTML = `
      <div class="p-10 text-center text-red-600">
        頁面載入錯誤：${String(err?.message || err)}
      </div>`;
  }
}

// 讓外部重新渲染（很少用到，但保留）
export function rerender() {
  if (_lastCtx) _render(_lastCtx);
}