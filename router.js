// router.js
const routes = new Map();

export function addRoute(path, page) {
  routes.set(path, page);
}

function parseHash() {
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

    console.log('[router] render:', path, page); // 加強列印

    if (!page) {
      app.innerHTML = `
        <div class="p-10 text-center text-slate-500 text-2xl">
          找不到頁面（${path}）
        </div>`;
      return;
    }

    if (typeof page.render !== 'function') {
      app.innerHTML = `
        <div class="p-10 text-center text-red-600">
          <div class="text-xl font-bold mb-2">頁面物件缺少 <code>render()</code>，因此沒有內容</div>
          <pre class="bg-slate-100 p-3 rounded text-left overflow-x-auto">${escapeHtml(JSON.stringify(page, null, 2))}</pre>
          <p class="mt-3 text-sm text-slate-600">請確認該檔案 <code>export default { render(){...}, mount(){...} }</code></p>
        </div>`;
      return;
    }

    app.innerHTML = page.render(ctx) || '';

    if (typeof page.mount === 'function') {
      try { await page.mount(ctx); }
      catch (e) { console.error('[router] mount error:', e); }
    }
  }

  function escapeHtml(s){return (s||'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));}

  window.removeEventListener('hashchange', render);
  window.addEventListener('hashchange', render);

  render();
}