// pages/adminrolespage.js
import { collection, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

export default async function AdminRolesPage(ctx){
  const { db, profile } = ctx;

  const wrap = document.createElement('div');
  wrap.className = 'max-w-6xl mx-auto px-4 py-6';

  // 不是 admin，直接擋
  if (!profile || profile.role !== 'admin'){
    wrap.innerHTML = `<div class="bg-white rounded-2xl shadow p-6">
      <h2 class="text-lg font-bold mb-3">權限管理</h2>
      <p class="text-slate-600">只有管理員可以使用此頁面。</p>
    </div>`;
    return wrap;
  }

  wrap.innerHTML = `
    <div class="bg-white rounded-2xl shadow p-6">
      <h2 class="text-lg font-bold mb-4">權限管理（Admin）</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead>
            <tr class="bg-slate-50 border-b">
              <th class="px-3 py-2">Email</th>
              <th class="px-3 py-2">顯示名稱</th>
              <th class="px-3 py-2">角色</th>
              <th class="px-3 py-2">Coach Email</th>
              <th class="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </div>
  `;

  const rows = wrap.querySelector('#rows');
  rows.innerHTML = `<tr><td class="px-3 py-4 text-slate-500" colspan="5">載入中…</td></tr>`;

  // 讀 users 集合
  const ss = await getDocs(collection(db,'users'));
  rows.innerHTML = '';

  for (const d of ss.docs){
    const u = d.data() || {};
    const tr = document.createElement('tr');
    tr.className = 'border-b';

    tr.innerHTML = `
      <td class="px-3 py-2">${u.email || ''}</td>
      <td class="px-3 py-2">${u.displayName || ''}</td>
      <td class="px-3 py-2">
        <select class="role px-2 py-1 rounded border">
          <option value="member" ${u.role==='member'?'selected':''}>member</option>
          <option value="coach"  ${u.role==='coach'?'selected':''}>coach</option>
          <option value="admin"  ${u.role==='admin'?'selected':''}>admin</option>
        </select>
      </td>
      <td class="px-3 py-2">${u.coachEmail || ''}</td>
      <td class="px-3 py-2">
        <button class="save px-3 py-1 rounded bg-slate-900 text-white text-sm">儲存</button>
      </td>
    `;

    tr.querySelector('.save').addEventListener('click', async ()=>{
      const role = tr.querySelector('.role').value;
      try{
        await updateDoc(doc(db,'users', d.id), { role });
        alert('已更新');
      }catch(e){ alert('更新失敗：'+(e?.message || e)); }
    });

    rows.appendChild(tr);
  }

  return wrap;
}