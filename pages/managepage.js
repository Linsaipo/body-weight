// pages/managepage.js
import {
  collection, query, where, getDocs, addDoc, doc, updateDoc,
  orderBy, onSnapshot, limit
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

import { serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

function buildLine(ctx, label, unit=''){
  return new Chart(ctx, {
    type: 'line',
    data: { datasets: [{ label, data: [], tension: 0.35, pointRadius: 3, borderWidth: 2, fill: false }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeOutCubic' },
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        tooltip: { enabled: true, callbacks: { label: (c)=>`${c.dataset.label}: ${c.parsed.y} ${unit}` } }
      },
      scales: { x: { type: 'time', time: { unit: 'day' } } }
    }
  });
}

function toPoints(rows, key){
  return rows.filter(r=>r[key]!=null).map(r=>({
    x: r.date?.toDate?.() ? r.date.toDate() : r.date,
    y: Number(r[key])
  }));
}

function fmt(d){
  const dd = d?.toDate?.() ? d.toDate() : new Date(d);
  return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;
}

export default {
  render(){
    return `
      <section class="max-w-6xl mx-auto py-6 space-y-8">
        <!-- 上方：邀請區 + 會員列表 -->
        <div class="bg-white rounded-2xl shadow p-6">
          <h2 class="text-lg font-bold mb-4">我的會員</h2>
          <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-4 gap-3">
            <div>
              <label class="block text-sm mb-1">輸入會員 Email 進行邀請</label>
              <input id="inviteEmail" type="email" placeholder="example@email.com"
                     class="px-3 py-2 rounded border w-72" />
            </div>
            <button id="inviteBtn" class="px-4 py-2 bg-emerald-600 text-white rounded-lg">發送邀請</button>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="bg-slate-50 border-b">
                <tr>
                  <th class="px-3 py-2">會員</th>
                  <th class="px-3 py-2">最後紀錄日</th>
                  <th class="px-3 py-2">最新體重</th>
                  <th class="px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody id="memberRows"></tbody>
            </table>
          </div>
        </div>

        <!-- 下方：會員詳情 -->
        <div class="bg-white rounded-2xl shadow p-6">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-bold">會員詳情：<span id="title" class="font-normal text-slate-600">未選擇</span></h2>
            <div class="text-sm text-slate-600">近 7 天：<span id="trend7">—</span>，近 30 天：<span id="trend30">—</span></div>
          </div>

          <!-- 圖表 -->
          <div class="grid md:grid-cols-2 gap-6 mb-6">
            <div class="h-[300px]"><canvas id="compChart"></canvas></div>
            <div class="h-[300px]"><canvas id="measureChart"></canvas></div>
          </div>

          <!-- 歷史紀錄 -->
          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="bg-slate-50 border-b">
                <tr>
                  <th class="px-3 py-2">日期</th>
                  <th class="px-3 py-2">體重</th>
                  <th class="px-3 py-2">體脂</th>
                  <th class="px-3 py-2">筋肉量</th>
                  <th class="px-3 py-2">腰圍</th>
                  <th class="px-3 py-2">備註</th>
                </tr>
              </thead>
              <tbody id="detailRows"></tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  },

  async mount(ctx){
    const { db, user, profile } = ctx;
    const inviteBtn = document.getElementById('inviteBtn');
    const inviteEmail = document.getElementById('inviteEmail');
    const memberRows = document.getElementById('memberRows');
    const detailRows = document.getElementById('detailRows');
    const titleEl = document.getElementById('title');
    const t7El = document.getElementById('trend7');
    const t30El = document.getElementById('trend30');
    const compChart = buildLine(document.getElementById('compChart'), '體重', 'kg');
    const measureChart = buildLine(document.getElementById('measureChart'), '腰圍', 'cm');
    let unsubDetail = null;

    // 🔁 發送邀請
    inviteBtn.addEventListener('click', async ()=>{
      const email = inviteEmail.value.trim().toLowerCase();
      if(!email) return alert('請輸入 Email');
      if(email === (user.email||'').toLowerCase()) return alert('不能邀請自己');
      try{
        await addDoc(collection(db,'invites'),{
          from: user.email,
          to: email,
          status:'pending',
          createdAt: serverTimestamp()
        });
        alert('邀請已發送');
        inviteEmail.value='';
      }catch(e){ alert('邀請失敗：'+(e?.message||e)); }
    });

    // 🧩 取得會員列表
    let qMembers;
    if(profile.role==='admin'){
      qMembers = query(collection(db,'users'));
    } else {
      const myEmail = (user.email||'').toLowerCase();
      qMembers = query(collection(db,'users'), where('coachEmail','==',myEmail));
    }
    const ss = await getDocs(qMembers);
    memberRows.innerHTML = '';
    for(const d of ss.docs){
      const u = d.data();
      const id = d.id;
      const lastQ = query(collection(db,'users',id,'entries'), orderBy('date','desc'), limit(1));
      const lastSnap = await getDocs(lastQ);
      let lastDate='—', lastWeight='—';
      lastSnap.forEach(ed=>{ const e=ed.data(); lastDate=fmt(e.date); lastWeight=e.weight; });

      const tr = document.createElement('tr');
      tr.className='border-b';
      tr.innerHTML=`
        <td class="px-3 py-2">${u.displayName||u.email||id}</td>
        <td class="px-3 py-2">${lastDate}</td>
        <td class="px-3 py-2">${lastWeight}</td>
        <td class="px-3 py-2"><button class="view px-2 py-1 border rounded">查看</button></td>
      `;
      tr.querySelector('.view').addEventListener('click',()=>openDetail(id,u.displayName||u.email||id));
      memberRows.appendChild(tr);
    }

    // 🔍 查看會員詳細資料
    function openDetail(memberUid, name){
      titleEl.textContent = name;
      unsubDetail?.(); unsubDetail=null;
      const qy = query(collection(db,'users',memberUid,'entries'), orderBy('date','asc'));
      unsubDetail = onSnapshot(qy,snap=>{
        const rows=[]; snap.forEach(d=>rows.push(d.data()));
        render(rows);
      });
    }

    function render(rows){
      detailRows.innerHTML='';
      for(const r of rows){
        const tr=document.createElement('tr');
        tr.className='border-b';
        tr.innerHTML=`
          <td class="px-3 py-2">${fmt(r.date)}</td>
          <td class="px-3 py-2">${r.weight||''}</td>
          <td class="px-3 py-2">${r.bodyFat||''}</td>
          <td class="px-3 py-2">${r.muscleMass||''}</td>
          <td class="px-3 py-2">${r.waist||''}</td>
          <td class="px-3 py-2">${r.note||''}</td>
        `;
        detailRows.appendChild(tr);
      }

      compChart.data.datasets[0].data = toPoints(rows,'weight');
      measureChart.data.datasets[0].data = toPoints(rows,'waist');
      compChart.update(); measureChart.update();

      const now=new Date();
      const daysAgo=n=>new Date(now.getFullYear(),now.getMonth(),now.getDate()-n);
      const delta=(r)=>r.length?Number((r.at(-1).weight - r[0].weight).toFixed(1)):null;
      const r7 = rows.filter(r=> new Date(r.date?.toDate?.()?r.date.toDate():r.date) >= daysAgo(7));
      const r30= rows.filter(r=> new Date(r.date?.toDate?.()?r.date.toDate():r.date) >= daysAgo(30));
      const d7=delta(r7), d30=delta(r30);
      t7El.textContent = d7===null?'—':(d7>0?`+${d7}`:`${d7}`)+' kg';
      t30El.textContent= d30===null?'—':(d30>0?`+${d30}`:`${d30}`)+' kg';
    }

    this._unsub=()=>unsubDetail?.();
  },

  destroy(){
    this._unsub?.();
  }
};