// src/pages/InputPage.js
import { saveEntry } from '../data/entries.js';

export default {
  render(ctx) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    return `
      <section class="max-w-3xl mx-auto py-6">
        <div class="bg-white rounded-2xl shadow p-6">
          <h2 class="text-lg font-bold mb-4">新增身體數據</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <div><label class="block text-sm mb-1">日期</label><input id="date" type="date" value="${yyyy}-${mm}-${dd}" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">體重 (kg) *</label><input id="weight" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">體脂肪 (%)</label><input id="bodyFat" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">內臟脂肪</label><input id="visceralFat" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">筋肉量 (kg)</label><input id="muscleMass" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">骨量 (kg)</label><input id="boneMass" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">基礎代謝 (kcal)</label><input id="bmr" type="number" step="1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">體內年齡</label><input id="bodyAge" type="number" step="1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">水分 (%)</label><input id="waterPct" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">胸圍 (cm)</label><input id="chest" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">上腹 (cm)</label><input id="upperAb" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">腰圍 (cm)</label><input id="waist" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">下腹 (cm)</label><input id="lowerAb" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">臀圍 (cm)</label><input id="hip" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">手臂 (cm)</label><input id="arm" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div><label class="block text-sm mb-1">大腿 (cm)</label><input id="thigh" type="number" step="0.1" class="w-full px-3 py-2 rounded border"/></div>
            <div class="sm:col-span-2"><label class="block text-sm mb-1">備註</label><textarea id="note" rows="2" class="w-full px-3 py-2 rounded border"></textarea></div>
          </div>
          <button id="save" class="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white">儲存</button>
        </div>
      </section>
    `;
  },

  async mount(ctx) {
    const { user } = ctx;
    const wrap = document;

    const btn = document.getElementById('save');
    btn.addEventListener('click', async () => {
      const g = id => document.getElementById(id)?.value;
      const dateStr = g('date');
      const weight = parseFloat(g('weight'));
      if (!dateStr) return alert('請選擇日期');
      if (Number.isNaN(weight)) return alert('請輸入體重');

      const num = (k) => {
        const v = g(k);
        return v === '' || v == null ? null : Number(v);
      };

      const payload = {
        date: new Date(dateStr + 'T00:00:00'),
        weight,
        bodyFat: num('bodyFat'),
        visceralFat: num('visceralFat'),
        muscleMass: num('muscleMass'),
        boneMass: num('boneMass'),
        bmr: num('bmr'),
        bodyAge: num('bodyAge'),
        waterPct: num('waterPct'),
        chest: num('chest'),
        upperAb: num('upperAb'),
        waist: num('waist'),
        lowerAb: num('lowerAb'),
        hip: num('hip'),
        arm: num('arm'),
        thigh: num('thigh'),
        note: g('note') || ''
      };

      try {
        await saveEntry(user.uid, payload);
        alert('已儲存');
        document.querySelectorAll('input,textarea').forEach(el => { if (el.id !== 'date') el.value = ''; });
      } catch (e) {
        alert('儲存失敗：' + (e?.message || e));
      }
    });
  }
};