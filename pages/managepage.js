// pages/managepage.js
import {
  collection, query, where, orderBy, limit, getDocs, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

function esc(s){ return (s||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
const fmtDate = (d)=>{
  const x = d?.toDate?.() ? d.toDate() : new Date(d||Date.now());
  if (Number.isNaN(x.getTime())) return '—';
  const mm = String(x.getMonth()+1).padStart(2,'0');
  const dd = String(x.getDate()).padStart(2,'0');
  return `${x.getFullYear()}-${mm}-${dd}`;
};

export default {
  /***********************
   * 畫面（教練 / Admin）
   ***********************/
  render(ctx){
    const isCoachOrAdmin = ctx?.profile?.role==='coach' || ctx?.profile?.role==='admin';

    return `
      <section class="max-w-6xl mx-auto py-6 space-y-6">

        <!-- 發送邀請 -->
        <div class="bg-white rounded-2xl shadow p-6">
          <h2 class="text-lg font-bold mb-3">發送邀請</h2>
          <p class="text-sm text-slate-600 mb-3">
            會員 → 輸入教練 Email；教練 / Admin → 輸入會員 Email。
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <input id="inviteEmail" type="email" class="w-full px-3 py-2 rounded border"
              placeholder="example@email.com" />
            <button id="sendInvite" class="px-4 py-2 rounded bg-emerald-600 text-white">發送邀請</button>
          </div>
          <p id="inviteHint" class="text-sm text-slate-500 mt-2"></p>
        </div>

        <!-- 邀請收件匣 -->
        <div class="bg-white rounded-2xl shadow p-6">
          <h2 class="text-lg font-bold mb-3">邀請收件匣</h2>
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
              <tbody id="invitesTbody"></tbody>
            </table>
          </div>
          <p id="invitesEmpty" class="text-sm text-slate-500 mt-3">尚無邀請。</p>
        </div>

        <!-- 我的會員列表（置頂區塊） -->
        ${isCoachOrAdmin ? `
        <div class="bg-white rounded-2xl shadow p-6">
          <h2 class="text-lg font-bold mb-3">我的會員</h2>
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
              <tbody id="coachMembersTbody"></tbody>
            </table>
          </div>
        </div>
        `:''}

        <!-- 會員詳情（顯示區）-->
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
              <tbody id="detailTbody"></tbody>
            </table>
          </div>
        </div>

      </section>
    `;
  },

  /***********************
   * 行為
   ***********************/
  async mount(ctx){
    const { db, user, profile } = ctx;
    const meEmail = (user?.email||'').toLowerCase();

    /******** 發送邀請 ********/
    const $ = (s)=>document.querySelector(s);
    const inviteEmail = $('#inviteEmail');
    const inviteHint  = $('#inviteHint');
    $('#sendInvite')?.addEventListener('click', async ()=>{
      const to = (inviteEmail.value||'').trim().toLowerCase();
      if (!to) { inviteHint.textContent='請輸入 Email'; return; }
      if (to === meEmail){ inviteHint.textContent='不能邀請自己'; return; }

      // 判斷誰發給誰
      const isCoach = profile?.role==='coach' || profile?.role==='admin';
      let type = isCoach ? 'coach_to_member' : 'member_to_coach';
      let memberUid = isCoach ? await findUidByEmail(db, to) : user.uid;

      if (isCoach && !memberUid){
        inviteHint.textContent='找不到該會員帳號（對方可能尚未登入建立檔案）';
        return;
      }

      try{
        inviteHint.textContent='送出中…';
        await addDoc(collection(db,'invites'), {
          type,
          fromUid: user.uid,
          fromEmail: meEmail,
          toEmail: to,
          memberUid,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        inviteEmail.value='';
        inviteHint.textContent='已送出邀請';
      }catch(e){
        inviteHint.textContent='送出失敗：'+(e?.message||e);
      }
    });

    /******** 收件匣（同意 / 拒絕 / 取消） ********/
    let unsubInvites=null;
    const box = new Map();           // id -> invite
    const renderInbox = ()=>{
      const tbody = $('#invitesTbody');
      const empty = $('#invitesEmpty');
      tbody.innerHTML='';
      if (box.size===0){ empty.style.display='block'; return; }
      empty.style.display='none';

      for (const [id,inv] of box){
        const mine = inv.fromUid===user.uid;
        const who  = mine ? (inv.toEmail||'') : (inv.fromEmail||'');
        const typeLabel = inv.type==='member_to_coach'?'會員→教練':'教練→會員';
        const tr = document.createElement('tr');
        tr.className='border-b';
        tr.innerHTML = `
          <td class="px-3 py-2">${esc(who)}</td>
          <td class="px-3 py-2">${typeLabel}</td>
          <td class="px-3 py-2">${inv.status}</td>
          <td class="px-3 py-2">
            ${mine
              ? `<button class="cancel px-2 py-1 rounded bg-slate-100 border">取消</button>`
              : `<button class="accept px-2 py-1 mr-2 rounded bg-emerald-600 text-white">同意</button>
                 <button class="reject px-2 py-1 rounded bg-slate-100 border">拒絕</button>`
            }
          </td>
        `;
        tr.querySelector('.cancel')?.addEventListener('click', async ()=>{
          try{ await updateDoc(doc(db,'invites', id), {status:'cancelled'}); }catch(e){ alert('取消失敗：'+(e?.message||e)); }
        });
        tr.querySelector('.accept')?.addEventListener('click', async ()=>{
  try{
    if (inv.type === 'member_to_coach') {
      // 我是教練（或 Admin）在同意會員的邀請
      // 滿足規則：必須同時寫入 inviteRefId（就是這一筆邀請的 id）
      await updateDoc(doc(db,'users', inv.memberUid), {
        coachEmail: meEmail,                // 我的 email（教練）
        inviteRefId: inv.id,               // ★ 關鍵：帶上 inviteRefId 才能過規則
        consent: true,
        consentAt: serverTimestamp()
      });
      await updateDoc(doc(db,'invites', inv.id), { status:'accepted' });

    } else if (inv.type === 'coach_to_member') {
      // 我是會員在同意教練的邀請（規則允許「本人更新」）
      await updateDoc(doc(db,'users', ctx.user.uid), {
        coachEmail: (inv.fromEmail || '').toLowerCase(), // 對方（教練）的 email
        inviteRefId: inv.id,
        consent: true,
        consentAt: serverTimestamp()
      });
      await updateDoc(doc(db,'invites', inv.id), { status:'accepted' });
    }

    alert('已完成綁定');
  }catch(e){
    console.error(e);
    alert('綁定失敗：' + (e?.message || e));
  }
});

    // 收我為收件者 + 我為發件者(pending)
    const subTo = onSnapshot(
      query(collection(db,'invites'), where('toEmail','==',meEmail), where('status','==','pending')),
      snap=>{
        for(const ch of snap.docChanges()){
          if (ch.type==='removed') box.delete(ch.doc.id);
          else box.set(ch.doc.id,{id:ch.doc.id, ...ch.doc.data()});
        }
        renderInbox();
      }
    );
    const subFrom = onSnapshot(
      query(collection(db,'invites'), where('fromUid','==',user.uid), where('status','==','pending')),
      snap=>{
        for(const ch of snap.docChanges()){
          if (ch.type==='removed') box.delete(ch.doc.id);
          else box.set(ch.doc.id,{id:ch.doc.id, ...ch.doc.data()});
        }
        renderInbox();
      }
    );
    unsubInvites = ()=>{ subTo(); subFrom(); };

    /******** 我的會員列表（教練 / Admin） ********/
    if (profile?.role==='coach' || profile?.role==='admin'){
      const tbody = document.getElementById('coachMembersTbody');
      tbody.innerHTML = `<tr><td class="px-3 py-3 text-slate-500" colspan="4">載入中…</td></tr>`;
      const myEmailLower = meEmail;

      const ss = await getDocs(query(collection(db,'users'), where('coachEmail','==', myEmailLower)));
      tbody.innerHTML='';
      for (const d of ss.docs){
        const u = d.data()||{};
        // 抓最後一筆紀錄
        let lastDate='—', lastWeight='—';
        const latest = await getDocs(query(collection(db,'users', d.id, 'entries'), orderBy('date','desc'), limit(1)));
        latest.forEach(ed=>{
          const e = ed.data();
          lastDate = fmtDate(e.date);
          lastWeight = e.weight ?? '—';
        });

        const tr = document.createElement('tr');
        tr.className='border-b';
        tr.innerHTML = `
          <td class="px-3 py-2">${esc(u.displayName || u.email || d.id)}</td>
          <td class="px-3 py-2">${lastDate}</td>
          <td class="px-3 py-2">${lastWeight}</td>
          <td class="px-3 py-2">
            <button class="view px-2 py-1 rounded bg-slate-100 border">查看</button>
          </td>
        `;
        tr.querySelector('.view')?.addEventListener('click', ()=> openDetailOfMember(ctx, d.id, (u.displayName||u.email||d.id)));
        tbody.appendChild(tr);
      }
    }

    /******** 卸載清理（頁面切換時由 router 呼叫） ********/
    this.__unmount = ()=>{
      if (typeof unsubInvites==='function') unsubInvites();
    };
  },

  unmount(){
    try{ this.__unmount?.(); }catch{}
  }
};

/* ---------- helpers ---------- */
async function findUidByEmail(db, emailLower){
  const ss = await getDocs(query(collection(db,'users'), where('email','==', emailLower), limit(1)));
  return ss.empty ? null : ss.docs[0].id;
}

/**
 * 打開會員詳情（右側的圖表＋表格）
 * 這裡用「體重折線圖 + 下方表格」的簡化版，保持和圖表/歷史頁一致的上下排列。
 */
let detailChart = null;
async function openDetailOfMember(ctx, memberUid, title){
  const { db } = ctx;
  const titleNode = document.getElementById('detailTitle');
  const tbody     = document.getElementById('detailTbody');
  const t7        = document.getElementById('trend7');
  const t30       = document.getElementById('trend30');
  titleNode.textContent = title;

  // 撈出該會員所有 entries
  const qs = await getDocs(query(collection(db,'users',memberUid,'entries'), orderBy('date','asc')));
  const rows = [];
  qs.forEach(d=> rows.push({ id:d.id, ...d.data() }));

  // 表格
  tbody.innerHTML='';
  for (const r of rows){
    const tr = document.createElement('tr');
    tr.className='border-b';
    tr.innerHTML = `
      <td class="px-3 py-2">${fmtDate(r.date)}</td>
      <td class="px-3 py-2">${r.weight??'—'}</td>
      <td class="px-3 py-2">${r.bodyFat??'—'}</td>
      <td class="px-3 py-2">${r.muscleMass??'—'}</td>
      <td class="px-3 py-2">${r.waist??'—'}</td>
      <td class="px-3 py-2">${esc(r.note||'')}</td>
    `;
    tbody.appendChild(tr);
  }

  // 圖表 + 7/30天趨勢
  const points = rows.map(r=>({x: r.date?.toDate?.() ? r.date.toDate() : r.date, y: Number(r.weight)}));
  const data = { datasets:[{ label:'體重 (kg)', data:points, tension:0.35, pointRadius:3, borderWidth:2, fill:false }] };
  const options = {
    responsive:true, maintainAspectRatio:false,
    animation:{ duration:400, easing:'easeInOutCubic' },
    interaction:{ mode:'nearest', intersect:false },
    plugins:{
      tooltip:{ enabled:true, callbacks:{ label:(c)=>`體重: ${c.parsed.y} kg` } },
      legend:{ labels:{ boxWidth:12 } }
    },
    scales:{ x:{ type:'time', time:{ unit:'day' } }, y:{ ticks:{ callback:(v)=>`${v} kg` } } }
  };
  const ctx2 = document.getElementById('detailChart').getContext('2d');
  if (detailChart){ detailChart.data=data; detailChart.update(); }
  else { detailChart = new Chart(ctx2, { type:'line', data, options }); }

  const now=new Date();
  const daysAgo=n=> new Date(now.getFullYear(),now.getMonth(),now.getDate()-n);
  const delta = (arr)=> arr.length? +(Number(arr.at(-1).weight)-Number(arr[0].weight)).toFixed(1): null;
  const r7  = rows.filter(r=> new Date(r.date?.toDate?.()?r.date.toDate():r.date) >= daysAgo(7));
  const r30 = rows.filter(r=> new Date(r.date?.toDate?.()?r.date.toDate():r.date) >= daysAgo(30));
  const d7=delta(r7), d30=delta(r30);
  t7.textContent  = d7===null ? '—' : (d7>0?`+${d7} kg`:`${d7} kg`);
  t30.textContent = d30===null? '—' : (d30>0?`+${d30} kg`:`${d30} kg`);
}