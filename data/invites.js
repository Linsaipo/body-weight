// src/data/invites.js
import { db } from '../firebase.js';
import { collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

export async function sendInvite({ type, fromUid, fromEmail, toEmail, memberUid }) {
  return addDoc(collection(db,'invites'), {
    type, fromUid, fromEmail, toEmail, memberUid, status:'pending', createdAt: serverTimestamp()
  });
}

export function listenMyInvites({ myUid, myEmailLower }, cb) {
  const box = new Map();
  const unsubTo = onSnapshot(query(collection(db,'invites'), where('toEmail','==', myEmailLower), where('status','==','pending')), snap => {
    for (const ch of snap.docChanges()) {
      if (ch.type === 'removed') box.delete(ch.doc.id);
      else box.set(ch.doc.id, { id: ch.doc.id, ...ch.doc.data() });
    }
    cb(new Map(box));
  });
  const unsubFrom = onSnapshot(query(collection(db,'invites'), where('fromUid','==', myUid), where('status','==','pending')), snap => {
    for (const ch of snap.docChanges()) {
      if (ch.type === 'removed') box.delete(ch.doc.id);
      else box.set(ch.doc.id, { id: ch.doc.id, ...ch.doc.data() });
    }
    cb(new Map(box));
  });
  return () => { unsubTo(); unsubFrom(); };
}

export const acceptInvite = (id) => updateDoc(doc(db,'invites', id), { status:'accepted' });
export const rejectInvite = (id) => updateDoc(doc(db,'invites', id), { status:'rejected' });
export const cancelInvite = (id) => updateDoc(doc(db,'invites', id), { status:'cancelled' });
