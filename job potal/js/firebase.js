/* =========================================================
   Firebase bootstrap (modular v10, ESM via CDN)
   ========================================================= */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword,
         signOut, sendPasswordResetEmail }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
         updateDoc, deleteDoc, query, where, orderBy, limit, startAfter,
         serverTimestamp, onSnapshot, increment, writeBatch, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { firebaseConfig, appCheckConfig } from "./firebase-config.js";

/* ---- App ---- */
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const storage = getStorage(app);

/* ---- App Check (best-effort; never blocks app boot) ---- */
(async () => {
  if (!appCheckConfig.enabled || appCheckConfig.siteKey.startsWith("YOUR_")) return;
  try {
    const { initializeAppCheck, ReCaptchaV3Provider } =
      await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js");
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckConfig.siteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (e) {
    console.warn("[AppCheck] not initialised:", e?.message || e);
  }
})();

/* ---- Re-exports ---- */
export {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp, onSnapshot,
  increment, writeBatch, Timestamp,
  ref, uploadBytesResumable, getDownloadURL, deleteObject
};

/* ---- Helpers ---- */
export async function isAdmin(uid) {
  if (!uid) return false;
  try {
    const t = await auth.currentUser?.getIdTokenResult(true);
    if (t?.claims?.admin === true) return true;
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists() && snap.data()?.active !== false;
  } catch { return false; }
}

export function tsToDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate();
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") { const d = new Date(v); return isNaN(d) ? null : d; }
  return null;
}

export function formatDate(v, opts = { day: "2-digit", month: "short", year: "numeric" }) {
  const d = tsToDate(v);
  return d ? d.toLocaleDateString("en-GB", opts) : "—";
}

export function formatDateTime(v) {
  const d = tsToDate(v);
  return d ? d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

export function timeAgo(v) {
  const d = tsToDate(v); if (!d) return "—";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24); if (dd < 30) return `${dd}d ago`;
  const mo = Math.floor(dd / 30); if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function makeRefId(prefix = "RX") {
  const y = new Date().getFullYear();
  const n = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}-${y}-${String(n).padStart(6, "0")}`;
}