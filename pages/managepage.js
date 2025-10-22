// pages/managepage.js
import {
  collection, query, where, getDocs, orderBy, onSnapshot, limit
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

function buildLine(ctx, label){
  return new Chart(ctx, {
    type:'line',
    data:{ datasets:[{ label, data:[], tension:0.35, pointRadius:3, borderWidth:2, fill:false }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{ duration:500, easing:'easeOutCubic' },
      interaction:{ mode:'nearest', intersect:false },
      plugins:{ tooltip:{ enabled:true, callbacks:{ label:(c)=>`${c.dataset.label}: ${c.parsed.y}` } } },
      scales:{ x:{ type:'time', time:{ unit:'day' } } }
    }
  });
}

function toPoints(rows){ return rows.map(r=>({x:(r.date?.toDate?.()?r.date.toDate():r.date), y:Number(r.weight)})); }
function fmt(d){ const dd=d?.toDate?.()? d.toDate(): new Date(d); const m=String(dd.getMonth()+1).padStart(2,'0'); const day=String(dd.getDate()).padStart(2,'0'); return `${dd.getFullYear()}-${m}-${day}`; }
function safe(v){ return (v==null||v==='')?'':v; }

export default {
  render(){
    return `
      <section class="max-w-6xl mx-auto py-6">
        <div class="grid md:grid-cols-3 gap-6">
          <div class="bg-white rounded-2xl shadow p-6 md:col-span-1">
            <h2 class="text-lg font-bold mb-4">我的會員</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-sm">
                <thead><tr class="bg-slate-50 border-b"><th class="px-3 py-2">會員</th><th class="px-3 py-2">最後紀錄日</th><th class="px-3 py-2">最新體重</th><th class="px-3 py-2">操作</th></tr></thead>
                <tbody id="memberRows"></tbody>
              </table>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow p-6 md:col-span-2">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-lg font-bold">會員詳情：<span id="title" class="font-normal text-slate-600">未選擇</span></h2>
              <div class="text-sm text-slate-600">近 7 天：<span id="trend7">—</span>，近 30 天：<span id="trend30">—</span></div>
            </div>
            <div class="h-[300px] mb-4"><canvas id="detailChart"></canvas></div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-sm">
                <thead><tr class="bg-slate-50 border-b"><th class="px-3 py-2">日期</th><th class="px-3 py-2">體重</th><th class="px-3 py-2">體脂</th><th class="px-3 py-2">筋肉量</th><th class="px-3 py-2">腰圍</th><th class="px-3 py-2">備註</th></tr></thead>
                <tbody id="detailRows"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  async mount(ctx){
    const { db, user, profile } = ctx;
    const memberRows = document.getElementById('memberRows');
    const detailRows = document.getElementById('detailRows');
    const titleEl = document.getElementById('title');
    const t7El = document.getElementById('trend7'); const t30El=document.getElementById('trend30');
    const chart = buildLine(document.getElementById('detailChart'), '體重 (kg)');

    let unsubDetail = null;

    // 取會員列表：coach=只看自己；admin=全部
    let qMembers;
    if (profile.role === 'admin'){
      qMembers = query(collection(db,'users'), where('role','in',['member','coach','admin']));
    }else{
      const my = (user.email||'').toLowerCase();
      qMembers = query(collection(db,'users'), where('coachEmail','==', my));
    }
    const ss = await getDocs(qMembers);

    memberRows.innerHTML='';
    for (const d of ss.docs){
      const u=d.data(); const id=d.id;
      // 抓最後一筆記錄
      const lastQ = query(collection(db,'users',id,'entries'), orderBy('date','desc'), limit(1));
      const lastSnap = await getDocs(lastQ);
      let lastDate='—', lastWeight='—';
      lastSnap.forEach(ed=>{ const e=ed.data(); lastDate=fmt(e.date); lastWeight=e.weight; });

      const tr=document.createElement('tr'); tr.className='border-b';
      tr.innerHTML = `
        <td class="px-3 py-2">${u.displayName||u.email||id}</td>
        <td class="px-3 py-2">${lastDate}</td>
        <td class="px-3 py-2">${lastWeight}</td>
        <td class="px-3 py-2">
          <button class="view px-2 py-1 mr-2 rounded bg-slate-100 border">查看</button>
        </td>
      `;
      tr.querySelector('.view')?.addEventListener('click', ()=> openDetail(id, u.displayName||u.email||id));
      memberRows.appendChild(tr);
    }

    function openDetail(memberUid, title){
      titleEl.textContent = title;
      unsubDetail?.(); unsubDetail = null;

      const qy = query(collection(db,'users',memberUid,'entries'), orderBy('date','asc'));
      unsubDetail = onSnapshot(qy, snap=>{
        const rows=[]; snap.forEach(d=>rows.push(d.data()));
        // 表格
        detailRows.innerHTML='';
        for(const r of rows){
          const tr=document.createElement('tr'); tr.className='border-b';
          tr.innerHTML = `
            <td class="px-3 py-2">${fmt(r.date)}</td>
            <td class="px-3 py-2">${safe(r.weight)}</td>
            <td class="px-3 py-2">${safe(r.bodyFat)}</td>
            <td class="px-3 py-2">${safe(r.muscleMass)}</td>
            <td class="px-3 py-2">${safe(r.waist)}</td>
            <td class="px-3 py-2">${(r.note||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]))}</td>`;
          detailRows.appendChild(tr);
        }
        // 圖
        chart.data.datasets[0].data = toPoints(rows);
        chart.update();
        // 趨勢
        const now=new Date(); const daysAgo=n=>new Date(now.getFullYear(),now.getMonth(),now.getDate()-n);
        const delta=r=>{ if(!r.length) return null; return +(Number(r.at(-1).weight)-Number(r[0].weight)).toFixed(1); };
        const r7 = rows.filter(r=> new Date(r.date?.toDate?.()?r.date.toDate():r.date) >= daysAgo(7));
        const r30= rows.filter(r=> new Date(r.date?.toDate?.()?r.date.toDate():r.date) >= daysAgo(30));
        const d7=delta(r7), d30=delta(r30);
        t7El.textContent = d7===null?'—':(d7>0?`+${d7} kg`:`${d7} kg`);
        t30El.textContent= d30===null?'—':(d30>0?`+${d30} kg`:`${d30} kg`);
      });
    }

    this._unsub = ()=>{ unsubDetail?.(); };
  },

  destroy(){
    this._unsub?.();
  }
};