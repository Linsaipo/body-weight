// src/data/users.js
import { db, ADMIN_EMAIL } from '../firebase.js';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, limit } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

export async function getMyProfile(uid) {
  const ref = doc(db,'users',uid);
  const snap = await getDoc(ref);
  return snap.exists()? snap.data(): null;
}

export async function listMembersForCoach(coachEmail) {
  const qy = query(collection(db,'users'), where('coachEmail','==', coachEmail));
  return await getDocs(qy);
}

export async function listAllUsers() {
  const qy = query(collection(db,'users'));
  return await getDocs(qy);
}

export async function setUserRole(uid, role, coachName=null, subscription=false) {
  return updateDoc(doc(db,'users',uid), { role, coachName, subscription });
}

export async function setCoachForMember(memberUid, coachEmail) {
  return updateDoc(doc(db,'users',memberUid), { coachEmail });
}

export async function findUidByEmail(emailLower) {
  const qy = query(collection(db,'users'), where('email','==', emailLower), limit(1));
  const ss = await getDocs(qy);
  return ss.empty ? null : ss.docs[0].id;
}
