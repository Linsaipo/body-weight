// pages/analyticspage.js
import {
  collection, query, orderBy, onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

const COLS = [
  { key: 'weight',      label: '體重' },
  { key: 'bodyFat',     label: '體脂' },
  { key: 'visceralFat', label: '內臟脂肪' },
  { key: 'muscleMass',  label: '筋肉量' },
  { key: 'boneMass',    label: '骨量' },
  { key: 'bmr',         label: '基礎代謝' },
  { key: 'bodyAge',     label: '體內年齡' },
  { key: 'waterPct',    label: '水分' },
  { key: 'chest',       label: '胸圍' },
  { key: 'upperAb',     label: '上腹' },
  { key: 'waist',       label: '腰圍' },
  { key: 'lowerAb',     label: '下腹' },
  { key: 'hip',         label: '臀圍' },
  { key: 'arm',         label: '手臂' },
  { key: 'thigh',       label: '大腿' }
];

function fmtDate(tsOrDate){
  const d = tsOrDate?.toDate?.() ? tsOrDate.toDate() : new Date(tsOrDate);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default {
  render(){
    return `
      <section class="max-w-6xl mx-auto px-4 py-6 space-y-6">

        <!-- 圖表 -->
        <div class="bg-white rounded-2xl shadow p-6">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-bold">體重走勢圖</h2>
            <div class="text-sm text-slate-600">
              近 7 天：<span id="trend7">—</span>，
              近 30 天：<span id="trend30">—</span>
            </div>
          </div>
          <div class="h-[360px]">
            <canvas id="weightChart" class="w-full h-full"></canvas>
          </div>
        </div>

        <!-- 歷史紀錄（完整欄位） -->
        <div class="bg-white rounded-2xl shadow">
          <div class="p-6 border-b">
            <h2 class="text-lg font-bold">歷史紀錄（完整欄位）</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead id="histHead"></thead>
              <tbody id="histBody"></tbody>
            </table>
          </div>
        </div>

      </section>
    `;
  },

  async mount(ctx){
    const { db, user } = ctx;
    if(!user) return;

    // refs
    const trend7 = document.getElementById('trend7');
    const trend30 = document.getElementById('trend30');
    const chartCanvas = document.getElementById('weightChart');
    const thead = document.getElementById('histHead');
    const tbody = document.getElementById('histBody');

    // 建表頭
    thead.innerHTML = `
      <tr class="bg-slate-50 border-b">
        <th class="px-3 py-2">日期</th>
        ${COLS.map(c => `<th class="px-3 py-2">${c.label}</th>`).join('')}
        <th class="px-3 py-2">備註</th>
      </tr>
    `;

    const qy = query(collection(db,'users', user.uid, 'entries'), orderBy('date','asc'));
    let chart;

    onSnapshot(qy, snap => {
      const rows = [];
      snap.forEach(d => rows.push({id:d.id, ...d.data()}));

      // 圖表資料
      const points = rows
        .filter(r => r.date && r.weight != null)
        .map(r => ({
          x: r.date?.toDate?.() ? r.date.toDate() : new Date(r.date),
          y: Number(r.weight)
        }));

      const data = {
        datasets: [{
          label: '體重 (kg)',
          data: points,
          borderColor: '#2563eb',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
          fill: false
        }]
      };
      const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
          tooltip: { enabled: true, callbacks: { label: c=>`體重: ${c.parsed.y} kg` } },
          legend: { display: true }
        },
        scales: {
          x: { type:'time', time:{ unit:'day' } },
          y: { title:{ display:true, text:'kg' } }
        }
      };
      if (chart) { chart.data = data; chart.options = options; chart.update(); }
      else { chart = new Chart(chartCanvas.getContext('2d'), { type:'line', data, options }); }

      // 趨勢
      if(!rows.length){ trend7.textContent='—'; trend30.textContent='—'; }
      else {
        const now=new Date();
        const daysAgo=n=> new Date(now.getFullYear(), now.getMonth(), now.getDate()-n);
        const delta=r=> r.length ? +(Number(r.at(-1).weight)-Number(r[0].weight)).toFixed(1) : null;
        const r7  = rows.filter(r => (r.date?.toDate?.()?r.date.toDate():new Date(r.date)) >= daysAgo(7));
        const r30 = rows.filter(r => (r.date?.toDate?.()?r.date.toDate():new Date(r.date)) >= daysAgo(30));
        const d7  = delta(r7), d30 = delta(r30);
        trend7.textContent  = d7===null ? '—' : (d7>0?`+${d7} kg`:`${d7} kg`);
        trend30.textContent = d30===null? '—' : (d30>0?`+${d30} kg`:`${d30} kg`);
      }

      // 歷史表（完整欄位）
      tbody.innerHTML = rows.map(r=>{
        const cells = COLS.map(c => `<td class="px-3 py-2">${r[c.key] ?? ''}</td>`).join('');
        return `
          <tr class="border-b">
            <td class="px-3 py-2">${fmtDate(r.date)}</td>
            ${cells}
            <td class="px-3 py-2">${r.note ?? ''}</td>
          </tr>
        `;
      }).join('');
    });
  }
};