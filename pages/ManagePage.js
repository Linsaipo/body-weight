// src/pages/ManagePage.js
import { listMembersForCoach, listAllUsers, setUserRole, findUidByEmail } from '../data/users.js';
import { doc, getDocs, query, collection, orderBy, limit, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { db } from '../firebase.js';

export default async function ManagePage(ctx) {
  const { profile, user, ADMIN_EMAIL } = ctx;
  const wrap = document.createElement('div');
  wrap.className = 'space-y-6';

  // Coach block
  const coachBlock = document.createElement('div');
  coachBlock.className = 'bg-white rounded-2xl shadow p-6';
  coachBlock.innerHTML = `
    <h2 class="text-lg font-bold mb-3">我的會員</h2>
    <div class="overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead><tr class="bg-slate-50 border-b"><th class="px-3 py-2">會員</th><th class="px-3 py-2">最後紀錄日</th><th class="px-3 py-2">最新體重</th></tr></thead>
        <tbody id="coachMembersTbody"></tbody>
      </table>
    </div>
  `;
  wrap.appendChild(coachBlock);

  if (profile.role === 'coach' || profile.role === 'admin') {
    const myEmail = (user.email||'').toLowerCase();
    const ss = await listMembersForCoach(myEmail);
    const tbody = coachBlock.querySelector('#coachMembersTbody');
    tbody.innerHTML='';
    for (const d of ss.docs) {
      const u = d.data();
      // latest entry
      const lastQ = query(collection(db,'users', d.id, 'entries'), orderBy('date','desc'), limit(1));
      const last = await getDocs(lastQ);
      let latestDate='—', latestWeight='—';
      last.forEach(ed=>{
        const e = ed.data();
        const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        latestDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        latestWeight = e.weight;
      });
      const tr = document.createElement('tr');
      tr.className = 'border-b';
      tr.innerHTML = `<td class="px-3 py-2">${u.displayName||u.email||d.id}</td>
                      <td class="px-3 py-2">${latestDate}</td>
                      <td class="px-3 py-2">${latestWeight}</td>`;
      tbody.appendChild(tr);
    }
  }

  // Admin block
  if (profile.role === 'admin') {
    const adminBlock = document.createElement('div');
    adminBlock.className = 'bg-white rounded-2xl shadow p-6';
    adminBlock.innerHTML = `
      <h2 class="text-lg font-bold mb-3">所有使用者</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead><tr class="bg-slate-50 border-b"><th class="px-3 py-2">名稱</th><th class="px-3 py-2">Email</th><th class="px-3 py-2">角色</th><th class="px-3 py-2">教練</th><th class="px-3 py-2">操作</th></tr></thead>
          <tbody id="allUsersTbody"></tbody>
        </table>
      </div>
    `;
    wrap.appendChild(adminBlock);

    const tbody = adminBlock.querySelector('#allUsersTbody');
    const all = await listAllUsers();
    tbody.innerHTML='';
    all.forEach(uDoc => {
      const u = uDoc.data();
      const tr = document.createElement('tr');
      tr.className = 'border-b';
      tr.innerHTML = `
        <td class="px-3 py-2">${u.displayName||u.email||uDoc.id}</td>
        <td class="px-3 py-2">${u.email||''}</td>
        <td class="px-3 py-2">
          <select class="roleSel border rounded px-2 py-1">
            <option value="member" ${u.role==='member'?'selected':''}>member</option>
            <option value="coach" ${u.role==='coach'?'selected':''}>coach</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>admin</option>
          </select>
        </td>
        <td class="px-3 py-2">${u.coachName||''}</td>
        <td class="px-3 py-2"><button class="saveBtn px-3 py-1 rounded bg-slate-900 text-white">儲存</button></td>
      `;
      tr.querySelector('.saveBtn').addEventListener('click', async ()=>{
        const role = tr.querySelector('.roleSel').value;
        await setUserRole(uDoc.id, role, u.coachName||null, u.subscription||false);
        alert('已更新角色');
      });
      tbody.appendChild(tr);
    });
  }

  return wrap;
}
