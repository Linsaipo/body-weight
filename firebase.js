// src/firebase.js
import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

export const ADMIN_EMAIL = 'linsaipo@gmail.com'; // 管理者 email

const firebaseConfig = {
  apiKey: "AIzaSyD81Aw3raqUcG_EUl8_W_WG3bxcunfA9rQ",
  authDomain: "body-weight-39dfd.firebaseapp.com",
  projectId: "body-weight-39dfd",
  storageBucket: "body-weight-39dfd.appspot.com",
  messagingSenderId: "745642339903",
  appId: "1:745642339903:web:d570fce93146c8861c528a"
};

let app; try { app = getApp(); } catch { app = initializeApp(firebaseConfig); }
export const auth = getAuth(app);
export const db = getFirestore(app);
