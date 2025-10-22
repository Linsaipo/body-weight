// src/data/entries.js
import { db } from '../firebase.js';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

export function saveEntry(uid, data) {
  data.createdAt = serverTimestamp();
  return addDoc(collection(db, 'users', uid, 'entries'), data);
}

export function listenEntries(uid, cb) {
  const qy = query(collection(db,'users',uid,'entries'), orderBy('date','asc'));
  return onSnapshot(qy, snap => {
    const rows = [];
    snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  });
}
