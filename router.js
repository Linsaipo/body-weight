// router.js
const routes = new Map();

export function addRoute(path, page) {
  routes.set(path, page);
}

function parseHash() {
  // 預設導到 /input
  const h = location.hash || '#/input';
  const m = h.match(/^#(\/[^?]*)/);
  return m ? m[1] : '/input';
}

export function startRouter(ctx) {
  const app = document.getElementById('app');
  if (!app) {
    console.error('[router] #app not found');
    return;
  }

  async function render() {
    const path = parseHash();
    const page = routes.get(path);

    // 除錯 log
    console.log('[router] render:', path);

    if (!page) {
      app.innerHTML = `
        <div class="p-10 text-center text-slate-500 text-2xl">
          找不到頁面（${path}）
        </div>`;
      return;
    }

    // 1) 先把 HTML render 進去
    app.innerHTML = page.render ? page.render(ctx) : '';

    // 2) 再執行 mount 綁定事件
    if (typeof page.mount === 'function') {
      try { await page.mount(ctx); } catch (e) { console.error('[router] mount error:', e); }
    }
  }

  window.removeEventListener('hashchange', render);
  window.addEventListener('hashchange', render);
  render();
}