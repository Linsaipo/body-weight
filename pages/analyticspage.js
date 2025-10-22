// pages/analyticspage.js
import {
  collection, query, orderBy, onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

function buildLine(ctx, label, unit){
  return new Chart(ctx, {
    type: 'line',
    data: { datasets:[{ label, data:[], tension:0.35, pointRadius:3, borderWidth:2, fill:false }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{ duration:500, easing:'easeOutCubic' },
      interaction:{ mode:'nearest', intersect:false },
      plugins:{ tooltip:{ enabled:true, callbacks:{ label:(c)=>`${c.dataset.label}: ${c.parsed.y} ${unit||''}` } } },
      scales:{
        x:{ type:'time', time:{ unit:'day' } },
        y:{ ticks:{ callback:v=>`${v}${unit||''}` } }
      }
    }
  });
}

function toPoints(rows, key){
  return rows.filter(r=>r[key]!=null).map(r=>({
    x: (r.date?.toDate?.()? r.date.toDate(): r.date),
    y: Number(r[key])
  }));
}

export default {
  render(){
    return `
      <section class="max-w-6xl mx-auto py-6 space-y-6">
        <div class="bg-white rounded-2xl shadow p-6">
          <h2 class="text-lg font-bold mb-3">圖表（可切換指標）</h2>
          <div class="grid md:grid-cols-2 gap-6">
            <div>
              <div class="mb-2">
                <label class="text-sm mr-2">身體組成</label>
                <select id="compSel" class="px-2 py-1 rounded border">
                  <option value="weight">體重 (kg)</option>
                  <option value="bodyFat">體脂肪 (%)</option>
                  <option value="visceralFat">內臟脂肪</option>
                  <option value="muscleMass">筋肉量 (kg)</option>
                  <option value="boneMass">骨量 (kg)</option>
                  <option value="bmr">基礎代謝 (kcal)</option>
                  <option value="bodyAge">體內年齡</option>
                  <option value="waterPct">水分 (%)</option>
                </select>
              </div>
              <div class="h-[300px]"><canvas id="compChart"></canvas></div>
            </div>
            <div>
              <div class="mb-2">
                <label class="text-sm mr-2">身體量測</label>
                <select id="measureSel" class="px-2 py-1 rounded border">
                  <option value="waist">腰圍 (cm)</option>
                  <option value="chest">胸圍 (cm)</option>
                  <option value="upperAb">上腹 (cm)</option>
                  <option value="lowerAb">下腹 (cm)</option>
                  <option value="hip">臀圍 (cm)</option>
                  <option value="arm">手臂 (cm)</option>
                  <option value="thigh">大腿 (cm)</option>
                </select>
              </div>
              <div class="h-[300px]"><canvas id="measureChart"></canvas></div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow overflow-hidden">
          <div class="p-6 border-b"><h2 class="text-lg font-bold">歷史紀錄（完整欄位）</h2></div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead>
                <tr class="bg-slate-50 border-b">
                  <th class="px-3 py-2">日期</th>
                  <th class="px-3 py-2">體重</th>
                  <th class="px-3 py-2">體脂肪</th>
                  <th class="px-3 py-2">內臟脂肪</th>
                  <th class="px-3 py-2">筋肉量</th>
                  <th class="px-3 py-2">骨量</th>
                  <th class="px-3 py-2">基代</th>
                  <th class="px-3 py-2">體內年齡</th>
                  <th class="px-3 py-2">水分</th>
                  <th class="px-3 py-2">胸</th>
                  <th class="px-3 py-2">上腹</th>
                  <th class="px-3 py-2">腰</th>
                  <th class="px-3 py-2">下腹</th>
                  <th class="px-3 py-2">臀</th>
                  <th class="px-3 py-2">手</th>
                  <th class="px-3 py-2">腿</th>
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
    const { db, user } = ctx;
    const compSel = document.getElementById('compSel');
    const measureSel = document.getElementById('measureSel');
    const rowsEl = document.getElementById('rows'); const empty = document.getElementById('emptyHint');

    const compChart = buildLine(document.getElementById('compChart'), '指標', '');
    const measureChart = buildLine(document.getElementById('measureChart'), '量測', 'cm');

    let rows = [];
    const qy = query(collection(db,'users', user.uid, 'entries'), orderBy('date','asc'));
    const unsub = onSnapshot(qy, snap=>{
      rows = []; snap.forEach(d=>rows.push(d.data()));
      renderTable(rows);
      updateCharts();
    });
    this._unsub = unsub;

    function unitOf(key){
      if (key==='weight' || key==='muscleMass' || key==='boneMass') return 'kg';
      if (key==='bmr') return 'kcal';
      if (key==='waterPct' || key==='bodyFat') return '%';
      return '';
    }

    function updateCharts(){
      // left
      const k1 = compSel.value;
      compChart.data.datasets[0].label = k1;
      compChart.options.plugins.tooltip.callbacks.label = (c)=>`${k1}: ${c.parsed.y} ${unitOf(k1)}`;
      compChart.data.datasets[0].data = toPoints(rows, k1);
      compChart.update();

      // right
      const k2 = measureSel.value;
      measureChart.data.datasets[0].label = k2;
      measureChart.options.plugins.tooltip.callbacks.label = (c)=>`${k2}: ${c.parsed.y} cm`;
      measureChart.data.datasets[0].data = toPoints(rows, k2);
      measureChart.update();
    }

    compSel.addEventListener('change', updateCharts);
    measureSel.addEventListener('change', updateCharts);

    function fmt(d){ const dd=d?.toDate?.()? d.toDate(): new Date(d); const m=String(dd.getMonth()+1).padStart(2,'0'); const day=String(dd.getDate()).padStart(2,'0'); return `${dd.getFullYear()}-${m}-${day}`; }
    function safe(v){ return (v==null||v==='')?'':v; }
    function renderTable(rs){
      rowsEl.innerHTML = '';
      if(!rs.length){ empty.textContent='目前沒有資料'; return; }
      empty.textContent='';
      for(const r of rs){
        const tr=document.createElement('tr'); tr.className='border-b';
        tr.innerHTML = `
          <td class="px-3 py-2">${fmt(r.date)}</td>
          <td class="px-3 py-2">${safe(r.weight)}</td>
          <td class="px-3 py-2">${safe(r.bodyFat)}</td>
          <td class="px-3 py-2">${safe(r.visceralFat)}</td>
          <td class="px-3 py-2">${safe(r.muscleMass)}</td>
          <td class="px-3 py-2">${safe(r.boneMass)}</td>
          <td class="px-3 py-2">${safe(r.bmr)}</td>
          <td class="px-3 py-2">${safe(r.bodyAge)}</td>
          <td class="px-3 py-2">${safe(r.waterPct)}</td>
          <td class="px-3 py-2">${safe(r.chest)}</td>
          <td class="px-3 py-2">${safe(r.upperAb)}</td>
          <td class="px-3 py-2">${safe(r.waist)}</td>
          <td class="px-3 py-2">${safe(r.lowerAb)}</td>
          <td class="px-3 py-2">${safe(r.hip)}</td>
          <td class="px-3 py-2">${safe(r.arm)}</td>
          <td class="px-3 py-2">${safe(r.thigh)}</td>
          <td class="px-3 py-2">${(r.note||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]))}</td>
        `;
        rowsEl.appendChild(tr);
      }
    }
  },

  destroy(){
    this._unsub?.();
  }
};