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
    if (typeof result === 'string') {
      app.innerHTML = result || '<div class="p-6">頁面沒有內容</div>';
    } else {
      app.innerHTML = result?.html || '<div class="p-6">頁面沒有內容</div>';
      if (typeof result?.mount === 'function') {
        queueMicrotask(() => {
          try { result.mount(ctx); }
          catch (e) {
            console.error('mount error:', e);
            app.innerHTML = `<div class="p-6 text-red-600">mount 發生錯誤：${e?.message || e}</div>`;
          }
        });
      }
    }
  } catch (e) {
    console.error('Router render error:', e);
    app.innerHTML = `<div class="p-6 text-red-600">載入頁面時發生錯誤：${e?.message || e}</div>`;
  }
}