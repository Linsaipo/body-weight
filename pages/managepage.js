// pages/managepage.js (email-only 版)
// 功能：我的會員清單 + 發送邀請 + 收件匣（同頁）
// 全部只用 Email，不需要 UID

import {
  collection, query, where, orderBy, limit,
  getDocs, onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

export default {
  render(ctx) {
    return `
      <section class="max-w-6xl mx-auto py-6 space-y-6">
        <!-- 我的會員（在最上面） -->
        <div class="bg-white rounded-2xl shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold">我的會員</h2>
          </div>
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
              <tbody id="memberRows">
                <tr><td class="px-3 py-4 text-slate-500" colspan="4">載入中…</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 發送邀請 -->
        <div class="bg-white rounded-2xl shadow p-6">
          <h2 class="text-lg font-bold mb-3">發送邀請</h2>
          <p class="text-sm text-slate-600 mb-3">
            會員 → 輸入教練 Email；教練 / Admin → 輸入會員 Email。
          </p>
          <div class="flex gap-3 items-center">
            <input id="inviteEmail" type="email" class="w-full max-w-md px-3 py-2 rounded border" placeholder="輸入對方 Email（小寫）"/>
            <button id="sendInviteBtn" class="px-4 py-2 rounded bg-emerald-600 text-white">發送邀請</button>
          </div>
          <p id="inviteHint" class="text-xs text-slate-500 mt-3"></p>
        </div>

        <!-- 邀請收件匣（包含：我收到的、我發出的） -->
        <div class="bg-white rounded-2xl shadow p-6">
          <h2 class="text-lg font-bold mb-3">邀請收件匣</h2>

          <div class="grid md:grid-cols-2 gap-6">
            <!-- 我收到的 -->
            <div>
              <h3 class="font-semibold mb-2">我收到的邀請（待回應）</h3>
              <div class="overflow-x-auto">
                <table class="min-w-full text-left text-sm">
                  <thead>
                    <tr class="bg-slate-50 border-b">
                      <th class="px-3 py-2">來源</th>
                      <th class="px-3 py-2">類型</th>
                      <th class="px-3 py-2">狀態</th>
                      <th class="px-3 py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody id="inboxToRows">
                    <tr><td class="px-3 py-4 text-slate-500" colspan="4">載入中…</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 我發出的 -->
            <div>
              <h3 class="font-semibold mb-2">我發出的邀請（待對方回應）</h3>
              <div class="overflow-x-auto">
                <table class="min-w-full text-left text-sm">
                  <thead>
                    <tr class="bg-slate-50 border-b">
                      <th class="px-3 py-2">對象</th>
                      <th class="px-3 py-2">類型</th>
                      <th class="px-3 py-2">狀態</th>
                      <th class="px-3 py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody id="inboxFromRows">
                    <tr><td class="px-3 py-4 text-slate-500" colspan="4">載入中…</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  async mount(ctx) {
    const { db, profile, user } = ctx;
    const meEmail = (user?.email || '').toLowerCase();

    // ====== 我的會員清單（coach / admin 看得到）======
    const memberRows = document.getElementById('memberRows');
    if (profile?.role === 'coach' || profile?.role === 'admin') {
      // 以 coachEmail == 我的 email 搜尋 users
      const qMembers = query(collection(db, 'users'), where('coachEmail', '==', meEmail));
      const ss = await getDocs(qMembers);
      memberRows.innerHTML = '';
      if (ss.empty) {
        memberRows.innerHTML = `<tr><td class="px-3 py-4 text-slate-500" colspan="4">目前沒有會員。</td></tr>`;
      } else {
        for (const d of ss.docs) {
          const u = d.data();
          // 取最新一筆 entries
          let latestDate = '—', latestWeight = '—';
          try {
            const qLast = query(
              collection(db, 'users', d.id, 'entries'),
              orderBy('date', 'desc'), limit(1)
            );
            const last = await getDocs(qLast);
            last.forEach(ed => {
              const e = ed.data();
              const dd = (e.date?.toDate?.() ? e.date.toDate() : new Date(e.date));
              latestDate = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;
              latestWeight = e.weight ?? '—';
            });
          } catch(e) {}

          const tr = document.createElement('tr');
          tr.className = 'border-b';
          tr.innerHTML = `
            <td class="px-3 py-2">${u.displayName || u.email || d.id}</td>
            <td class="px-3 py-2">${latestDate}</td>
            <td class="px-3 py-2">${latestWeight}</td>
            <td class="px-3 py-2">
              <button class="view px-3 py-1 rounded bg-slate-100 border">查看</button>
            </td>
          `;
          tr.querySelector('.view')?.addEventListener('click', () => {
            // 這裡導去圖表頁（可帶 email 當參數；圖表頁自行解析）
            location.hash = `#/analytics?member=${encodeURIComponent(u.email || '')}`;
          });
          memberRows.appendChild(tr);
        }
      }
    } else {
      memberRows.innerHTML = `<tr><td class="px-3 py-4 text-slate-500" colspan="4">你不是教練/管理員，此區無資料。</td></tr>`;
    }

    // ====== 發送邀請（email-only）======
    const inviteInput = document.getElementById('inviteEmail');
    const sendBtn = document.getElementById('sendInviteBtn');
    const hint = document.getElementById('inviteHint');

    sendBtn?.addEventListener('click', async () => {
      const toEmail = (inviteInput.value || '').trim().toLowerCase();
      if (!toEmail) return alert('請輸入對方 Email');
      if (toEmail === meEmail) return alert('不能邀請自己');

      const type = (profile?.role === 'coach' || profile?.role === 'admin')
        ? 'coach_to_member' : 'member_to_coach';

      try {
        await addDoc(collection(db, 'invites'), {
          type,
          fromEmail: meEmail,
          toEmail,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        inviteInput.value = '';
        hint.textContent = '已送出邀請（請對方到收件匣同意）。';
      } catch (e) {
        console.error(e);
        alert('發送失敗：' + (e?.message || e));
      }
    });

    // ====== 邀請收件匣（我收到的 + 我發出的）======
    const inboxToRows = document.getElementById('inboxToRows');
    const inboxFromRows = document.getElementById('inboxFromRows');

    // 我收到的（收件者 = 我，pending）
    const unsubTo = onSnapshot(
      query(collection(db, 'invites'), where('toEmail', '==', meEmail), where('status', '==', 'pending')),
      (snap) => {
        inboxToRows.innerHTML = '';
        if (snap.empty) {
          inboxToRows.innerHTML = `<tr><td class="px-3 py-4 text-slate-500" colspan="4">目前沒有收到的邀請。</td></tr>`;
          return;
        }
        snap.forEach(d => {
          const inv = { id: d.id, ...d.data() };
          const tr = document.createElement('tr');
          tr.className = 'border-b';
          tr.innerHTML = `
            <td class="px-3 py-2">${inv.fromEmail}</td>
            <td class="px-3 py-2">${inv.type}</td>
            <td class="px-3 py-2">${inv.status}</td>
            <td class="px-3 py-2">
              <button class="accept px-2 py-1 mr-2 rounded bg-emerald-600 text-white">同意</button>
              <button class="reject px-2 py-1 rounded bg-slate-100 border">拒絕</button>
            </td>
          `;

          // 同意（依 type 分流）
          tr.querySelector('.accept')?.addEventListener('click', async () => {
            try {
              if (inv.type === 'coach_to_member') {
                // 會員接受教練的邀請：更新自己的 users 檔
                await updateDoc(doc(db, 'users', user.uid), {
                  coachEmail: (inv.fromEmail || '').toLowerCase(),
                  inviteRefId: inv.id,
                  consent: true,
                  consentAt: serverTimestamp()
                });
                await updateDoc(doc(db, 'invites', inv.id), { status: 'accepted' });
              } else if (inv.type === 'member_to_coach') {
                // 教練接受會員的邀請：找到該會員的 users 檔（用 email 查），再更新
                const memberUid = await findUidByEmail(db, (inv.fromEmail || '').toLowerCase());
                if (!memberUid) { alert('找不到該會員帳號（對方可能尚未登入建立檔案）'); return; }

                await updateDoc(doc(db, 'users', memberUid), {
                  coachEmail: meEmail,
                  inviteRefId: inv.id,
                  consent: true,
                  consentAt: serverTimestamp()
                });
                await updateDoc(doc(db, 'invites', inv.id), { status: 'accepted' });
              }
            } catch (e) {
              console.error(e);
              alert('同意失敗：' + (e?.message || e));
            }
          });

          // 拒絕
          tr.querySelector('.reject')?.addEventListener('click', async () => {
            try {
              await updateDoc(doc(db, 'invites', inv.id), { status: 'rejected' });
            } catch (e) { alert('拒絕失敗：' + (e?.message || e)); }
          });

          inboxToRows.appendChild(tr);
        });
      }
    );

    // 我發出的（寄件者 = 我，pending）
    const unsubFrom = onSnapshot(
      query(collection(db, 'invites'), where('fromEmail', '==', meEmail), where('status', '==', 'pending')),
      (snap) => {
        inboxFromRows.innerHTML = '';
        if (snap.empty) {
          inboxFromRows.innerHTML = `<tr><td class="px-3 py-4 text-slate-500" colspan="4">目前沒有待處理的邀請。</td></tr>`;
          return;
        }
        snap.forEach(d => {
          const inv = { id: d.id, ...d.data() };
          const tr = document.createElement('tr');
          tr.className = 'border-b';
          tr.innerHTML = `
            <td class="px-3 py-2">${inv.toEmail}</td>
            <td class="px-3 py-2">${inv.type}</td>
            <td class="px-3 py-2">${inv.status}</td>
            <td class="px-3 py-2">
              <button class="cancel px-2 py-1 rounded bg-slate-100 border">取消</button>
            </td>
          `;
          tr.querySelector('.cancel')?.addEventListener('click', async () => {
            try {
              await updateDoc(doc(db, 'invites', inv.id), { status: 'cancelled' });
            } catch (e) { alert('取消失敗：' + (e?.message || e)); }
          });
          inboxFromRows.appendChild(tr);
        });
      }
    );

    // 避免熱切換記憶體累積（簡易做法）
    this._unsub = () => { unsubTo(); unsubFrom(); };
  },

  unmount() {
    if (this._unsub) try { this._unsub(); } catch {}
  }
};

// 以 email 找 users 的 uid（必要時使用；email-only 仍可做此查詢）
async function findUidByEmail(db, emailLower) {
  const qy = query(collection(db, 'users'), where('email', '==', emailLower), limit(1));
  const ss = await getDocs(qy);
  return ss.empty ? null : ss.docs[0].id;
}