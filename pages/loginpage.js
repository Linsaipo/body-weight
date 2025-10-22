// pages/loginpage.js
import {
  GoogleAuthProvider, OAuthProvider,
  signInWithPopup, signInWithRedirect
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';

export default {
  render() {
    return `
      <section class="max-w-md mx-auto py-10">
        <div class="bg-white rounded-2xl shadow p-6">
          <h2 class="text-xl font-bold mb-4">選擇登入方式</h2>
          <div class="space-y-3">
            <button id="btnGoogle" class="w-full px-4 py-2 rounded-lg border bg-white hover:bg-slate-50 flex items-center justify-center gap-2">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" class="w-5 h-5"/>
              <span>使用 Google 登入</span>
            </button>
            <button id="btnApple" class="w-full px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 flex items-center justify-center gap-2">
              <svg viewBox="0 0 14 18" class="w-4 h-4 fill-current"><path d="M9.57.16a3.45 3.45 0 0 1-.82 2.56c-.7.83-1.86 1.49-3.01 1.4-.15-1.03.43-2.12 1.07-2.76A3.56 3.56 0 0 1 9.57.16Zm3.69 14.8c-.5 1.15-.74 1.65-1.38 2.66-1.1 1.7-2.65 3.83-4.56 3.86-1.06.02-1.79-.36-2.69-.36-.9 0-1.67.35-2.7.37-1.88.04-3.48-1.84-4.58-3.53C-.2 15.94-.64 13.4.5 11.47c.82-1.35 2.11-2.21 3.57-2.24 1.01-.02 1.95.4 2.66.4.7 0 1.85-.49 3.13-.42 1.26.08 2.41.52 3.18 1.33-2.8 1.6-2.35 5.79 1.22 6.42Z"/></svg>
              <span>使用 Apple 登入</span>
            </button>
          </div>
        </div>
      </section>
    `;
  },
  async mount(ctx) {
    const { auth } = ctx;
    const googleProvider = new GoogleAuthProvider();
    const appleProvider = new OAuthProvider('apple.com');
    appleProvider.addScope('email'); appleProvider.addScope('name');

    const bind = (id, fn)=>document.getElementById(id)?.addEventListener('click', fn);

    bind('btnGoogle', async ()=>{
      try{ await signInWithPopup(auth, googleProvider); }
      catch{ try{ await signInWithRedirect(auth, googleProvider); }catch(e){ alert('Google 登入失敗：'+(e?.message||e)); } }
    });

    bind('btnApple', async ()=>{
      try{ await signInWithPopup(auth, appleProvider); }
      catch{ try{ await signInWithRedirect(auth, appleProvider); }catch(e){ alert('Apple 登入失敗：'+(e?.message||e)); } }
    });
  }
};