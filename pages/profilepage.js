// src/pages/ProfilePage.js
import { auth } from '../firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { db } from '../firebase.js';

export default async function ProfilePage(ctx) {
  const { user } = ctx;
  const ref = doc(db,'users', user.uid);
  const snap = await getDoc(ref);
  const u = snap.data()||{};
  const wrap = document.createElement('div');
  wrap.className = 'max-w-xl mx-auto';
  wrap.innerHTML = `
    <div class="bg-white rounded-2xl shadow p-6">
      <h2 class="text-lg font-bold mb-4">我的資料</h2>
      <div class="space-y-3">
        <div><label class="block text-sm mb-1">Email</label><input class="w-full px-3 py-2 rounded border bg-slate-50" value="${u.email||user.email||''}" disabled/></div>
        <div><label class="block text-sm mb-1">顯示名稱</label><input id="displayName" class="w-full px-3 py-2 rounded border" value="${u.displayName||''}"/></div>
        <div><label class="block text-sm mb-1">教練 Email</label><input id="coachEmail" class="w-full px-3 py-2 rounded border" value="${u.coachEmail||''}"/></div>
      </div>
      <div class="mt-4 flex gap-3">
        <button id="save" class="px-4 py-2 rounded bg-slate-900 text-white">儲存</button>
        <button onclick="logout()" class="px-4 py-2 rounded border">登出</button>
      </div>
    </div>
  `;
  wrap.querySelector('#save').addEventListener('click', async ()=>{
    const displayName = wrap.querySelector('#displayName').value.trim();
    const coachEmail = wrap.querySelector('#coachEmail').value.trim().toLowerCase() || null;
    try{
      await updateDoc(ref, { displayName, coachEmail });
      alert('已更新');
    }catch(e){ alert('更新失敗：'+(e?.message||e)); }
  });
  return wrap;
}
