// pages/ManagePage.js
import {
  collection, query, orderBy, where, getDocs, limit
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

export default function ManagePage(ctx) {
  const { db, profile, user } = ctx;

  const wrap = document.createElement('div');
  wrap.className = 'max-w-6xl mx-auto px-4 py-6 space-y-6';

  // 左：會員列表
  const listBox = document.createElement('div');
  listBox.innerHTML = `
    <div class="bg-white rounded-2xl shadow p-6">
      <h2 class="text-lg font-bold mb-4">我的會員</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead>
            <tr class="bg-slate-50 border-b">
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
  `;

  // 右：選定會員的圖表 + 歷史
  const detailBox = document.createElement('div');
  detailBox.innerHTML = `
    <div class="bg-white rounded-2xl shadow p-6">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold">會員詳情：<span id="detailName" class="font-normal text-slate-600">未選擇</span></h2>
        <div class="text-sm text-slate-600">近 7 天：<span id="trend7">—</span>，近 30 天：<span id="trend30">—</span></div>
      </div>

      <div class="space-y-6">
        <div class="h-[300px]"><canvas id="chart1"></canvas></div>
        <div class="h-[300px]"><canvas id="chart2"></canvas></div>
      </div>

      <div class="mt-6 overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead>
            <tr class="bg-slate-50 border-b">
              <th class="px-3 py-2">日期</th>
              <th class="px-3 py-2">體重 (kg)</th>
              <th class="px-3 py-2">體脂 (%)</th>
              <th class="px-3 py-2">筋肉量 (kg)</th>
              <th class="px-3 py-2">腰圍 (cm)</th>
              <th class="px-3 py-2">備註</th>
            </tr>
          </thead>
          <tbody id="entryRows"></tbody>
        </table>
      </div>
    </div>
  `;

  wrap.append(listBox, detailBox);

  const memberRows = listBox.querySelector('#memberRows');
  const detailName = detailBox.querySelector('#detailName');
  const trend7 = detailBox.querySelector('#trend7');
  const trend30 = detailBox.querySelector('#trend30');
  const entryRows = detailBox.querySelector('#entryRows');

  // 使用全域 Chart（index.html 已以 <script> 載入）
  const Chart = window.Chart;

  const chart1 = new Chart(detailBox.querySelector('#chart1'), {
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true,
      animation: { duration: 800, easing: 'easeInOutQuart' },
      interaction: { mode: 'nearest', intersect: false },
      elements: { line: { tension: 0.3 } },
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}` }
        }
      },
      scales: {
        x: { type: 'time', time: { unit: 'day' } },
        y: { title: { display: true, text: 'kg' } }
      }
    }
  });
  const chart2 = new Chart(detailBox.querySelector('#chart2'), {
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true,
      animation: { duration: 800, easing: 'easeInOutQuart' },
      interaction: { mode: 'nearest', intersect: false },
      elements: { line: { tension: 0.3 } },
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}` }
        }
      },
      scales: {
        x: { type: 'time', time: { unit: 'day' } },
        y: { title: { display: true, text: 'kg' } }
      }
    }
  });

  // 開啟會員詳情
  async function openDetail(memberUid, title) {
    detailName.textContent = title;

    const qy = query(collection(db, 'users', memberUid, 'entries'), orderBy('date', 'asc'));
    const ss = await getDocs(qy);
    const rows = ss.docs.map(d => ({ id: d.id, ...d.data() }));

    // 表格
    entryRows.innerHTML = rows.map(r => `
      <tr class="border-b">
        <td class="px-3 py-2">${fmtDate(r.date)}</td>
        <td class="px-3 py-2">${safe(r.weight)}</td>
        <td class="px-3 py-2">${safe(r.bodyFat)}</td>
        <td class="px-3 py-2">${safe(r.muscleMass)}</td>
        <td class="px-3 py-2">${safe(r.waist)}</td>
        <td class="px-3 py-2">${escapeHtml(r.note || '')}</td>
      </tr>
    `).join('');

    // 圖表資料
    const toDate = (v) => v?.toDate?.() ? v.toDate() : new Date(v);
    const weightData = rows.map(r => ({ x: toDate(r.date), y: r.weight ?? null }));
    const muscleData = rows.map(r => ({ x: toDate(r.date), y: r.muscleMass ?? null }));

    chart1.data = { datasets: [{ label: '體重 (kg)', data: weightData, pointRadius: 3, borderWidth: 2, fill: false }] };
    chart2.data = { datasets: [{ label: '筋肉量 (kg)', data: muscleData, pointRadius: 3, borderWidth: 2, fill: false }] };
    chart1.update();
    chart2.update();

    // 趨勢（7 / 30）
    const now = new Date();
    const daysAgo = n => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
    const delta = arr => arr.length ? +(arr.at(-1).weight - arr[0].weight).toFixed(1) : null;
    const r7 = rows.filter(r => toDate(r.date) >= daysAgo(7));
    const r30 = rows.filter(r => toDate(r.date) >= daysAgo(30));
    const d7 = delta(r7);
    const d30 = delta(r30);
    trend7.textContent = d7 === null ? '—' : `${d7 > 0 ? '+' : ''}${d7} kg`;
    trend30.textContent = d30 === null ? '—' : `${d30 > 0 ? '+' : ''}${d30} kg`;
  }

  // 讀取會員清單
  async function loadMembers() {
    const myEmail = (user.email || '').toLowerCase();
    let qMembers;
    if (profile.role === 'admin') {
      qMembers = query(collection(db, 'users')); // Admin 看全部
    } else {
      qMembers = query(collection(db, 'users'), where('coachEmail', '==', myEmail)); // 教練看自己
    }
    const ss = await getDocs(qMembers);
    memberRows.innerHTML = '';

    for (const d of ss.docs) {
      const u = d.data();
      const lastQ = query(collection(db, 'users', d.id, 'entries'), orderBy('date', 'desc'), limit(1));
      const last = await getDocs(lastQ);
      let latestDate = '—', latestWeight = '—';
      last.forEach(ed => {
        const e = ed.data();
        latestDate = fmtDate(e.date);
        latestWeight = e.weight ?? '—';
      });

      const tr = document.createElement('tr');
      tr.className = 'border-b';
      tr.innerHTML = `
        <td class="px-3 py-2">${u.displayName || u.email || d.id}</td>
        <td class="px-3 py-2">${latestDate}</td>
        <td class="px-3 py-2">${latestWeight}</td>
        <td class="px-3 py-2">
          <button class="view px-2 py-1 rounded bg-slate-100 border hover:bg-slate-200">查看</button>
        </td>
      `;
      tr.querySelector('.view').addEventListener('click', () =>
        openDetail(d.id, u.displayName || u.email || d.id)
      );
      memberRows.appendChild(tr);
    }
  }

  loadMembers();
  return wrap;
}

/* helpers */
function fmtDate(tsOrDate) {
  const d = tsOrDate?.toDate?.() ? tsOrDate.toDate() : new Date(tsOrDate);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function safe(v){ return (v===null||v===undefined)? '' : v; }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }