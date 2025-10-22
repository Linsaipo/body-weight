// pages/profilepage.js
import {
  doc, getDoc, updateDoc
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

export default {
  render(){
    return `
      <section class="max-w-xl mx-auto py-6">
        <div class="bg-white rounded-2xl shadow p-6">
          <h2 class="text-lg font-bold mb-4">我的資料</h2>
          <div class="space-y-3">
            <div>
              <label class="block text-sm mb-1">顯示名稱</label>
              <input id="displayName" type="text" class="w-full px-3 py-2 rounded border"/>
            </div>
            <div>
              <label class="block text-sm mb-1">教練 Email（顯示用）</label>
              <input id="coachEmail" type="email" class="w-full px-3 py-2 rounded border" disabled/>
            </div>
            <button id="saveProfile" class="px-4 py-2 rounded bg-slate-900 text-white">儲存</button>
          </div>
        </div>
      </section>
    `;
  },

  async mount(ctx){
    const { db, user } = ctx;
    const uref = doc(db,'users',user.uid);
    const snap = await getDoc(uref);
    if(snap.exists()){
      const u = snap.data();
      document.getElementById('displayName').value = u.displayName || '';
      document.getElementById('coachEmail').value  = u.coachEmail || '';
    }
    document.getElementById('saveProfile').addEventListener('click', async ()=>{
      try{
        await updateDoc(uref, { displayName: document.getElementById('displayName').value.trim() });
        alert('已更新');
      }catch(e){ alert('更新失敗：'+(e?.message||e)); }
    });
  }
};