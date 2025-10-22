// /router.js
const routes = {};

export function addRoute(path, pageFn) {
  routes[path] = pageFn;
}

export function startRouter(ctx) {
  window.addEventListener('hashchange', () => render(ctx));
  render(ctx);
}

function render(ctx) {
  const app = document.getElementById('app');
  if (!app) return;

  const path = (location.hash || '#/analytics').replace(/^#/, '');
  const pageFn = routes[path] || routes['/analytics'];

  try {
    const result = pageFn ? pageFn(ctx) : '';
    // 允許回傳純字串或 { html, mount }
    if (typeof result === 'string') {
      app.innerHTML = result;
    } else {
      app.innerHTML = result?.html || '';
      // 等 DOM 插入後再掛載事件
      if (typeof result?.mount === 'function') {
        queueMicrotask(() => result.mount(ctx));
      }
    }
  } catch (e) {
    console.error('Router render error:', e);
    app.innerHTML = `<div class="p-6 text-red-600">載入頁面時發生錯誤：${e?.message || e}</div>`;
  }
}