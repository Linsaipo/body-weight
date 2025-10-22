// pages/analyticspage.js
import {
  collection, query, orderBy, onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

function buildLine(ctx,label,unit=''){
  return new Chart(ctx,{
    type:'line',
    data:{datasets:[{label,data:[],tension:0.35,pointRadius:3,borderWidth:2,fill:false}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'nearest',intersect:false},
      plugins:{tooltip:{callbacks:{label:(c)=>`${c.dataset.label}: ${c.parsed.y} ${unit}`}}},
      scales:{x:{type:'time',time:{unit:'day'}},y:{ticks:{callback:v=>`${v}${unit}`}}}
    }
  });
}
function toPoints(rows,key){return rows.filter(r=>r[key]!=null).map(r=>({x:r.date?.toDate?.()?r.date.toDate():r.date,y:Number(r[key])}));}
function fmt(d){const dd=d?.toDate?.()?d.toDate():new Date(d);return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;}

export default {
  render(){
    return `
      <section class="max-w-6xl mx-auto py-6 space-y-6">
        <div class="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 class="text-lg font-bold">圖表分析</h2>
          <div class="grid gap-6">
            <div class="h-[300px]"><canvas id="compChart"></canvas></div>
            <div class="h-[300px]"><canvas id="measureChart"></canvas></div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow overflow-hidden">
          <div class="p-6 border-b"><h2 class="text-lg font-bold">歷史紀錄（完整欄位）</h2></div>
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
              <tbody id="rows"></tbody>
            </table>
            <p id="emptyHint" class="px-6 py-6 text-sm text-slate-500">載入中…</p>
          </div>
        </div>
      </section>
    `;
  },

  async mount(ctx){
    const { db,user }=ctx;
    const compChart=buildLine(document.getElementById('compChart'),'體重','kg');
    const measureChart=buildLine(document.getElementById('measureChart'),'腰圍','cm');
    const rowsEl=document.getElementById('rows'); const empty=document.getElementById('emptyHint');

    const qy=query(collection(db,'users',user.uid,'entries'),orderBy('date','asc'));
    const unsub=onSnapshot(qy,snap=>{
      const rows=[]; snap.forEach(d=>rows.push(d.data()));
      render(rows);
    });

    function render(rows){
      rowsEl.innerHTML='';
      if(!rows.length){ empty.textContent='目前沒有資料'; return; }
      empty.textContent='';
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
        rowsEl.appendChild(tr);
      }
      compChart.data.datasets[0].data=toPoints(rows,'weight');
      measureChart.data.datasets[0].data=toPoints(rows,'waist');
      compChart.update(); measureChart.update();
    }
    this._unsub=unsub;
  },
  destroy(){ this._unsub?.(); }
};