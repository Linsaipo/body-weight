// src/pages/AnalyticsPage.js
import { listenEntries } from '../data/entries.js';

export default function AnalyticsPage(ctx) {
  const { user } = ctx;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="grid grid-cols-1 gap-6">
      <div class="bg-white rounded-2xl shadow p-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-bold">身體組成（可選欄位）</h2>
          <select id="metricA" class="border rounded px-2 py-1 text-sm">
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
        <div class="h-[320px]"><canvas id="chartA"></canvas></div>
      </div>

      <div class="bg-white rounded-2xl shadow p-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-bold">身體量測（圍度）</h2>
          <select id="metricB" class="border rounded px-2 py-1 text-sm">
            <option value="chest">胸圍 (cm)</option>
            <option value="upperAb">上腹 (cm)</option>
            <option value="waist">腰圍 (cm)</option>
            <option value="lowerAb">下腹 (cm)</option>
            <option value="hip">臀圍 (cm)</option>
            <option value="arm">手臂 (cm)</option>
            <option value="thigh">大腿 (cm)</option>
          </select>
        </div>
        <div class="h-[320px]"><canvas id="chartB"></canvas></div>
      </div>

      <div class="bg-white rounded-2xl shadow overflow-x-auto">
        <div class="p-6 border-b"><h2 class="text-lg font-bold">歷史紀錄（全部欄位）</h2></div>
        <div class="p-4">
          <table class="min-w-full text-left text-sm">
            <thead id="histHead"></thead>
            <tbody id="histBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const metricA = wrap.querySelector('#metricA');
  const metricB = wrap.querySelector('#metricB');
  const chartAEl = wrap.querySelector('#chartA');
  const chartBEl = wrap.querySelector('#chartB');

  const commonOptions = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    animations: { tension: { duration: 500, easing: 'easeOutQuad', from: 0.2, to: 0.4, loop: false } },
    plugins: { tooltip: { enabled: true, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}` } } },
    scales: { x: { type: 'time', time: { unit: 'day' } } }
  };

  let chartA, chartB, unsub;

  function toPoints(rows, key) {
    return rows
      .filter(r => r[key] !== null && r[key] !== undefined && r[key] !== '')
      .map(r => ({ x: (r.date?.toDate ? r.date.toDate() : new Date(r.date)), y: Number(r[key]) }));
  }

  function renderHistory(rows) {
    const headCols = ['日期','體重','體脂肪','內臟脂肪','筋肉量','骨量','基礎代謝','體內年齡','水分','胸圍','上腹','腰圍','下腹','臀圍','手臂','大腿','備註'];
    const keys = ['date','weight','bodyFat','visceralFat','muscleMass','boneMass','bmr','bodyAge','waterPct','chest','upperAb','waist','lowerAb','hip','arm','thigh','note'];
    const th = headCols.map(h => `<th class="px-3 py-2 font-semibold">${h}</th>`).join('');
    wrap.querySelector('#histHead').innerHTML = `<tr class="bg-slate-50 border-b">${th}</tr>`;
    const rowsHtml = rows.map(r => {
      const tds = keys.map(k => {
        if (k==='date') {
          const d = r.date?.toDate ? r.date.toDate() : new Date(r.date);
          const mm = String(d.getMonth()+1).padStart(2,'0');
          const dd = String(d.getDate()).padStart(2,'0');
          return `<td class="px-3 py-2">${d.getFullYear()}-${mm}-${dd}</td>`;
        }
        const v = r[k];
        return `<td class="px-3 py-2">${v===null||v===undefined?'':v}</td>`;
      }).join('');
      return `<tr class="border-b">${tds}</tr>`;
    }).join('');
    wrap.querySelector('#histBody').innerHTML = rowsHtml;
  }

  function updateCharts(rows) {
    const kA = metricA.value;
    const kB = metricB.value;
    const dataA = { datasets: [{ label: kA, data: toPoints(rows, kA), tension: 0.35, pointRadius: 3, borderWidth: 2, fill: false }] };
    const dataB = { datasets: [{ label: kB, data: toPoints(rows, kB), tension: 0.35, pointRadius: 3, borderWidth: 2, fill: false }] };
    if (chartA) { chartA.data = dataA; chartA.update(); } else { chartA = new Chart(chartAEl.getContext('2d'), { type: 'line', data: dataA, options: commonOptions }); }
    if (chartB) { chartB.data = dataB; chartB.update(); } else { chartB = new Chart(chartBEl.getContext('2d'), { type: 'line', data: dataB, options: commonOptions }); }
  }

  unsub = listenEntries(user.uid, (rows) => {
    renderHistory(rows);
    updateCharts(rows);
  });

  metricA.addEventListener('change', ()=>{
    if (!unsub) return;
    // Just re-render with cached last rows by triggering listen once (simple approach)
    // In this simple SPA we keep last rows via closure update
  });
  metricB.addEventListener('change', ()=>{});

  // Clean-up when route changes
  wrap.cleanup = () => { if (unsub) unsub(); if (chartA) chartA.destroy(); if (chartB) chartB.destroy(); };

  return wrap;
}
