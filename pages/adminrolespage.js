import {
  collection, query, orderBy, getDocs, updateDoc, doc, onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

export default function AdminRolesPage(ctx) {
  return {
    title: '權限管理（Admin 專用）',
    async render(root) {
      // 只有 admin 可以進來
      if (!ctx?.profile || ctx.profile.role !== 'admin') {
        root.innerHTML = `
          <section class="max-w-4xl mx-auto px-4 py-10">
            <div class="bg-white rounded-2xl shadow p-8 text-center">
              <h2 class="text-xl font-bold mb-3">403 無權限</h2>
              <p class="text-slate-600">只有管理員（admin）能使用此頁面。</p>
              <a class="inline-block mt-5 px-4 py-2 rounded bg-slate-900 text-white" href="#/analytics">回報表 / 歷史</a>
            </div>
          </section>
        `;
        return;
      }

      root.innerHTML = `
        <section class="max-w-6xl mx-auto px-4 py-6">
          <div class="bg-white rounded-2xl shadow p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold">權限管理（Admin）</h2>
              <div class="text-sm text-slate-600">
                目前登入：<span class="font-mono">${ctx.user?.email || ''}</span>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-sm">
                <thead>
                  <tr class="bg-slate-50 border-b">
                    <th class="px-3 py-2">Email</th>
                    <th class="px-3 py-2">顯示名稱</th>
                    <th class="px-3 py-2">目前角色</th>
                    <th class="px-3 py-2">設定為</th>
                    <th class="px-3 py-2">狀態</th>
                  </tr>
                </thead>
                <tbody id="admin-roles-tbody">
                  <tr><td class="px-3 py-4 text-slate-500" colspan="5">讀取中…</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      `;

      const tbody = root.querySelector('#admin-roles-tbody');

      // 讀取所有使用者
      const qy = query(collection(ctx.db, 'users'), orderBy('email'));
      const snap = await getDocs(qy);

      const rows = [];
      snap.forEach(d => rows.push({ id: d.id, ...d.data() }));

      if (!rows.length) {
        tbody.innerHTML = `<tr><td class="px-3 py-4 text-slate-500" colspan="5">目前還沒有使用者資料</td></tr>`;
        return;
      }

      tbody.innerHTML = rows.map(u => {
        const role = (u.role || 'member');
        const email = u.email || '';
        const name = u.displayName || '';
        const isMe = (ctx.user?.uid === u.id);

        return `
          <tr class="border-b align-middle">
            <td class="px-3 py-2 font-mono">${email}</td>
            <td class="px-3 py-2">${name}</td>
            <td class="px-3 py-2">
              <span class="inline-block rounded bg-slate-100 px-2 py-1">${role}</span>
            </td>
            <td class="px-3 py-2">
              <select class="px-2 py-1 border rounded text-sm" data-uid="${u.id}" ${isMe ? 'disabled' : ''}>
                <option value="member" ${role==='member'?'selected':''}>member</option>
                <option value="coach"  ${role==='coach'?'selected':''}>coach</option>
                <option value="admin"  ${role==='admin'?'selected':''}>admin</option>
              </select>
              ${isMe ? '<span class="ml-2 text-xs text-slate-500">(無法修改自己的角色)</span>' : ''}
            </td>
            <td class="px-3 py-2">
              <span id="s-${u.id}" class="text-slate-500">—</span>
            </td>
          </tr>
        `;
      }).join('');

      // 監聽 select 變更，直接更新 Firestore
      tbody.addEventListener('change', async (e) => {
        const sel = e.target;
        if (!sel.matches('select[data-uid]')) return;

        const uid = sel.getAttribute('data-uid');
        const role = sel.value;
        const status = root.querySelector(`#s-${uid}`);

        try {
          status.textContent = '儲存中…';
          await updateDoc(doc(ctx.db, 'users', uid), { role });
          status.textContent = '已儲存';
          status.className = 'text-emerald-600';
        } catch (err) {
          console.error(err);
          status.textContent = '錯誤';
          status.className = 'text-red-600';
        }
      });
    }
  };
}