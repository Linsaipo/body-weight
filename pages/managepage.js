// pages/managepage.js
import {
  collection, query, where, getDocs, onSnapshot,
  orderBy, limit, doc, getDoc, updateDoc, addDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

// 小工具
function fmtDate(tsOrDate) {
  const d = tsOrDate?.toDate?.() ? tsOrDate.toDate() : new Date(tsOrDate);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
async function findUidByEmail(db, emailLower) {
  const qy = query(collection(db, 'users'), where('email', '==', (emailLower||'').toLowerCase()), limit(1));
  const ss = await getDocs(qy);
  return ss.empty ? null : ss.docs[0].id;
}

export default {
  render() {
    return `
    <section class="max-w-6xl mx-auto px-4 py-6 space-y-8">

      <!-- 會員清單（置頂） -->
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
            <tbody id="membersBody"></tbody>
          </table>
        </div>
      </div>

      <!-- 發送邀請 -->
      <div class="bg-white rounded-2xl shadow p-6">
        <h2 class="text-lg font-bold mb-4">發送邀請</h2>
        <p class="text-sm text-slate-600 mb-3">會員 → 輸入教練 Email；教練 / Admin → 輸入會員 Email。</p>
        <div class="flex flex-col sm:flex-row gap-3">
          <input id="inviteEmail" type="email" class="flex-1 px-3 py-2 rounded border" placeholder="example@email.com" />
          <button id="sendInvite" class="px-4 py-2 rounded bg-emerald-600 text-white">發送邀請</button>
        </div>
      </div>

      <!-- 邀請收件匣 -->
      <div class="bg-white rounded-2xl shadow p-6">
        <h2 class="text-lg font-bold mb-4">邀請收件匣</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead>
              <tr class="bg-slate-50 border-b">
                <th class="px-3 py-2">來源 / 對象</th>
                <th class="px-3 py-2">類型</th>
                <th class="px-3 py-2">狀態</th>
                <th class="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody id="invitesBody"></tbody>
          </table>
        </div>
        <p id="invitesEmpty" class="text-sm text-slate-500 mt-3 hidden">尚無邀請。</p>
      </div>

      <!-- 會員詳情（圖表＋歷史，上下排列） -->
      <div class="bg-white rounded-2xl shadow p-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-bold">會員詳情：<span id="detailTitle" class="font-normal text-slate-600">未選擇</span></h2>
          <div class="text-sm text-slate-600">近 7 天：<span id="trend7">—</span>，近 30 天：<span id="trend30">—</span></div>
        </div>
        <div class="h-[320px]"><canvas id="detailChart" class="w-full h-full"></canvas></div>
        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead>
              <tr class="bg-slate-50 border-b">
                <th class="px-3 py-2">日期</th>
                <th class="px-3 py-2">體重</th>
                <th class="px-3 py-2">體脂</th>
                <th class="px-3 py-2">筋肉量</th>
                <th class="px-3 py-2">腰圍</th>
                <th class="px-3 py-2">備註</th>
              </tr>
            </thead>
            <tbody id="detailBody"></tbody>
          </table>
        </div>
      </div>
    </section>
    `;
  },

  async mount(ctx) {
    const { db, user, profile } = ctx;
    const meEmail = (user.email||'').toLowerCase();
    const isCoachLike = profile?.role === 'coach' || profile?.role === 'admin';

    // Refs
    const membersBody = document.getElementById('membersBody');
    const inviteEmail = document.getElementById('inviteEmail');
    const sendInviteBtn = document.getElementById('sendInvite');
    const invitesBody = document.getElementById('invitesBody');
    const invitesEmpty = document.getElementById('invitesEmpty');
    const titleNode = document.getElementById('detailTitle');
    const trend7 = document.getElementById('trend7');
    const trend30 = document.getElementById('trend30');
    const chartCanvas = document.getElementById('detailChart');
    const detailBody = document.getElementById('detailBody');

    let chart, unsubDetail = null;

    /* ========== 會員清單（置頂） ========== */
    const qMembers = query(collection(db, 'users'), where('coachEmail', '==', meEmail));
    onSnapshot(qMembers, async snap => {
      membersBody.innerHTML = '';
      for (const d of snap.docs) {
        const u = d.data() || {};
        const lastQ = query(collection(db, 'users', d.id, 'entries'), orderBy('date', 'desc'), limit(1));
        const last = await getDocs(lastQ);
        let lastDate = '—', lastWeight = '—';
        last.forEach(ed => { const e = ed.data()||{}; lastDate = fmtDate(e.date); lastWeight = e.weight ?? '—'; });

        const tr = document.createElement('tr');
        tr.className = 'border-b';
        tr.innerHTML = `
          <td class="px-3 py-2">${u.displayName || u.email || d.id}</td>
          <td class="px-3 py-2">${lastDate}</td>
          <td class="px-3 py-2">${lastWeight}</td>
          <td class="px-3 py-2"><button class="view px-3 py-1 rounded bg-slate-100 border">查看</button></td>
        `;
        tr.querySelector('.view')?.addEventListener('click', () => openMemberDetail(d.id, u.displayName || u.email || d.id));
        membersBody.appendChild(tr);
      }
    });

    /* ========== 會員詳情（圖 + 表） ========== */
    function openMemberDetail(memberUid, title) {
      titleNode.textContent = title;
      if (unsubDetail) unsubDetail();

      const qy = query(collection(db, 'users', memberUid, 'entries'), orderBy('date', 'asc'));
      unsubDetail = onSnapshot(qy, snap => {
        const rows = [];
        snap.forEach(d => rows.push({ id: d.id, ...d.data() }));

        // 表格
        detailBody.innerHTML = '';
        for (const r of rows) {
          const tr = document.createElement('tr');
          tr.className = 'border-b';
          tr.innerHTML = `
            <td class="px-3 py-2">${fmtDate(r.date)}</td>
            <td class="px-3 py-2">${r.weight ?? ''}</td>
            <td class="px-3 py-2">${r.bodyFat ?? ''}</td>
            <td class="px-3 py-2">${r.muscleMass ?? ''}</td>
            <td class="px-3 py-2">${r.waist ?? ''}</td>
            <td class="px-3 py-2">${r.note ?? ''}</td>
          `;
          detailBody.appendChild(tr);
        }

        // 圖
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
            borderColor: '#3b82f6',
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
            tooltip: { enabled: true, callbacks: { label: c => `體重: ${c.parsed.y} kg` } },
            legend: { display: true }
          },
          scales: { x: { type: 'time', time: { unit: 'day' } }, y: { title: { display: true, text: 'kg' } } }
        };
        if (chart) { chart.data = data; chart.options = options; chart.update(); }
        else { chart = new Chart(chartCanvas.getContext('2d'), { type: 'line', data, options }); }

        // 趨勢
        if (!rows.length) { trend7.textContent = '—'; trend30.textContent = '—'; return; }
        const now = new Date();
        const daysAgo = n => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
        const delta = r => r.length ? +(Number(r.at(-1).weight) - Number(r[0].weight)).toFixed(1) : null;
        const r7 = rows.filter(r => (r.date?.toDate?.() ? r.date.toDate() : new Date(r.date)) >= daysAgo(7));
        const r30 = rows.filter(r => (r.date?.toDate?.() ? r.date.toDate() : new Date(r.date)) >= daysAgo(30));
        const d7 = delta(r7), d30 = delta(r30);
        trend7.textContent = d7 === null ? '—' : (d7 > 0 ? `+${d7} kg` : `${d7} kg`);
        trend30.textContent = d30 === null ? '—' : (d30 > 0 ? `+${d30} kg` : `${d30} kg`);
      });
    }

    /* ========== 發送邀請 ========== */
    import {
  collection, addDoc, serverTimestamp, getDocs, query, where, limit
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

async function sendInvite(ctx, toEmailRaw){
  const { db, user, profile } = ctx;
  if(!user) return alert('請先登入');

  const meEmail = (user.email || '').toLowerCase();
  const toEmail = (toEmailRaw || '').trim().toLowerCase();
  if(!toEmail) return alert('請輸入對方 Email');

  // 角色判斷（教練 / 會員）
  const isCoach = profile?.role === 'coach' || profile?.role === 'admin';

  // 預設值，注意 memberUid 不能是 undefined
  let type = isCoach ? 'coach_to_member' : 'member_to_coach';
  let memberUid = null;

  if(isCoach){
    // 教練 → 會員：規則允許 memberUid 為 null（或字串），兩種都可過
    // 如要嘗試抓到會員 uid 可加上這段（抓不到就維持 null）
    const findQ = query(
      collection(db,'users'),
      where('email','==', toEmail),
      limit(1)
    );
    const ss = await getDocs(findQ);
    if(!ss.empty){
      memberUid = ss.docs[0].id;  // 可有可無；規則允許 null
    }
  }else{
    // 會員 → 教練：這邊 memberUid 一定知道，就是本人
    memberUid = user.uid;
  }

  const payload = {
    type,                       // 'member_to_coach' or 'coach_to_member'
    fromUid: user.uid,
    fromEmail: meEmail,
    toEmail,
    memberUid: memberUid ?? null, // ★ 不要是 undefined
    status: 'pending',            // ★ 必須是 pending
    createdAt: serverTimestamp()  // ★ 必須 create 當下就寫入
  };

  console.log('[invite] create payload =', payload);
  await addDoc(collection(db,'invites'), payload);

  alert('邀請已送出');
}

    /* ========== 邀請收件匣（同意 / 拒絕 / 取消） ========== */
    const toQ = query(collection(db, 'invites'), where('toEmail', '==', meEmail), where('status', '==', 'pending'));
    const fromQ = query(collection(db, 'invites'), where('fromUid', '==', user.uid), where('status', '==', 'pending'));
    const box = new Map(); // id -> invite

    const renderInbox = () => {
      invitesBody.innerHTML = '';
      if (box.size === 0) { invitesEmpty.classList.remove('hidden'); return; }
      invitesEmpty.classList.add('hidden');

      for (const [id, inv] of box) {
        const mine = inv.fromUid === user.uid;
        const who = mine ? inv.toEmail : inv.fromEmail;
        const typeLabel = inv.type === 'member_to_coach' ? '會員→教練' : '教練→會員';

        const tr = document.createElement('tr');
        tr.className = 'border-b';
        tr.innerHTML = `
          <td class="px-3 py-2">${who}</td>
          <td class="px-3 py-2">${typeLabel}</td>
          <td class="px-3 py-2">待回應</td>
          <td class="px-3 py-2">
            ${mine
              ? `<button class="cancel px-2 py-1 rounded bg-slate-100 border">取消</button>`
              : `<button class="accept px-2 py-1 mr-2 rounded bg-emerald-600 text-white">同意</button>
                 <button class="reject px-2 py-1 rounded bg-slate-100 border">拒絕</button>`
            }
          </td>
        `;

        // 取消（我發出的）
        tr.querySelector('.cancel')?.addEventListener('click', async () => {
          try { await updateDoc(doc(db, 'invites', id), { status: 'cancelled' }); }
          catch (e) { alert('取消失敗：' + (e?.message || e)); }
        });

        // ✅ 同意（我收到的）— 這裡已整合你提供的 2 段程式碼
        tr.querySelector('.accept')?.addEventListener('click', async () => {
          try {
            if (inv.type === 'member_to_coach') {
              // 教練端「同意會員 → 教練」
              await updateDoc(doc(db, 'users', inv.memberUid), {
                coachEmail: meEmail,          // 教練 email（小寫）
                inviteRefId: inv.id,          // ★ 規則檢查：pending / toEmail==me() / type==member_to_coach / memberUid match
                consent: true,
                consentAt: serverTimestamp()
              });
              await updateDoc(doc(db, 'invites', id), { status: 'accepted' });
              alert('已完成綁定（會員→教練）');
            } else {
              // 會員端「同意教練 → 會員」
              await updateDoc(doc(db, 'users', user.uid), {
                coachEmail: (inv.fromEmail || '').toLowerCase(),
                inviteRefId: inv.id,          // 保留追蹤（本人更新，規則允許）
                consent: true,
                consentAt: serverTimestamp()
              });
              await updateDoc(doc(db, 'invites', id), { status: 'accepted' });
              alert('已完成綁定（教練→會員）');
            }
          } catch (e) {
            alert('同意失敗：' + (e?.message || e));
          }
        });

        // 拒絕（我收到的）
        tr.querySelector('.reject')?.addEventListener('click', async () => {
          try { await updateDoc(doc(db, 'invites', id), { status: 'rejected' }); }
          catch (e) { alert('拒絕失敗：' + (e?.message || e)); }
        });

        invitesBody.appendChild(tr);
      }
    };

    const unsubTo = onSnapshot(toQ, snap => {
      for (const ch of snap.docChanges()) {
        if (ch.type === 'removed') box.delete(ch.doc.id);
        else box.set(ch.doc.id, { id: ch.doc.id, ...ch.doc.data() });
      }
      renderInbox();
    });
    const unsubFrom = onSnapshot(fromQ, snap => {
      for (const ch of snap.docChanges()) {
        if (ch.type === 'removed') box.delete(ch.doc.id);
        else box.set(ch.doc.id, { id: ch.doc.id, ...ch.doc.data() });
      }
      renderInbox();
    });
  }
};