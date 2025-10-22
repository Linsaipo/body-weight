// /pages/adminrolespage.js
import {
  collection, onSnapshot, query, orderBy, updateDoc, doc
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

export default function AdminRolesPage(ctx) {
  const { db, profile } = ctx;

  // 非 admin 直接顯示禁止畫面（防止手動輸入 #/roles）
  if (!profile || profile.role !== 'admin') {
    return `
      <div class="bg-white rounded-2xl shadow p-6">
        <h2 class="text-lg font-bold mb-3">權限管理</h2>
        <p class="text-sm text-slate-600">只有 Admin 可以使用此頁面。</p>
      </div>
    `;
  }

  const html = /*html*/`
    <div class="bg-white rounded-2xl shadow p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 class="text-lg font-bold">權限管理（Admin 專用）</h2>
        <input id="rolesSearch" type="text" placeholder="搜尋 Email / 名稱"
               class="w-full sm:w-72 px-3 py-2 rounded border" />
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead>
            <tr class="bg-slate-50 border-b">
              <th class="px-3 py-2">Email</th>
              <th class="px-3 py-2">顯示名稱</th>
              <th class="px-3 py-2">角色</th>
              <th class="px-3 py-2">教練 Email</th>
              <th class="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody id="rolesTbody"></tbody>
        </table>
      </div>
      <p id="rolesEmpty" class="text-sm text-slate-500 mt-3">載入中…</p>
    </div>
  `;

  function mount() {
    const tbody = document.getElementById('rolesTbody');
    const empty = document.getElementById('rolesEmpty');
    const searchInput = document.getElementById('rolesSearch');

    let allUsers = [];   // 原始資料
    let keyword = '';    // 搜尋關鍵字

    const qy = query(collection(db, 'users'), orderBy('email', 'asc'));
    const unsub = onSnapshot(qy, snap => {
      allUsers = [];
      snap.forEach(d => {
        const u = d.data();
        allUsers.push({ id: d.id, ...u });
      });
      render();
    });

    function render() {
      const rows = allUsers.filter(u => {
        if (!keyword) return true;
        const k = keyword.toLowerCase();
        return (u.email || '').toLowerCase().includes(k) ||
               (u.displayName || '').toLowerCase().includes(k);
      });

      tbody.innerHTML = '';
      if (rows.length === 0) {
        empty.textContent = '沒有符合條件的使用者。';
        empty.classList.remove('hidden');
        return;
      }
      empty.classList.add('hidden');

      for (const u of rows) {
        const tr = document.createElement('tr');
        tr.className = 'border-b';
        tr.innerHTML = `
          <td class="px-3 py-2 whitespace-nowrap">${u.email || ''}</td>
          <td class="px-3 py-2">${u.displayName || ''}</td>
          <td class="px-3 py-2">
            <select class="roleSel px-2 py-1 rounded border">
              <option value="member" ${u.role === 'member' ? 'selected' : ''}>member</option>
              <option value="coach"  ${u.role === 'coach'  ? 'selected' : ''}>coach</option>
              <option value="admin"  ${u.role === 'admin'  ? 'selected' : ''}>admin</option>
            </select>
          </td>
          <td class="px-3 py-2">${u.coachEmail || '—'}</td>
          <td class="px-3 py-2">
            <button class="saveBtn px-2 py-1 rounded bg-slate-100 border">儲存</button>
          </td>
        `;
        // 儲存按鈕
        tr.querySelector('.saveBtn')?.addEventListener('click', async () => {
          const newRole = tr.querySelector('.roleSel').value;
          try {
            await updateDoc(doc(db, 'users', u.id), { role: newRole });
            tr.querySelector('.saveBtn').textContent = '已儲存';
            setTimeout(() => (tr.querySelector('.saveBtn').textContent = '儲存'), 1500);
          } catch (e) {
            alert('更新失敗：' + (e?.message || e));
          }
        });
        tbody.appendChild(tr);
      }
    }

    // 搜尋
    searchInput?.addEventListener('input', (e) => {
      keyword = e.target.value || '';
      render();
    });

    // 離開頁面時自動 unsubscribe（簡易處理：路由再次渲染就會移除舊 DOM，自然解除）
    window.addEventListener('hashchange', () => unsub(), { once: true });
  }

  // 回傳 {html, mount} 交給 router 掛載
  return { html, mount };
}