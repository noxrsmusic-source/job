/* =========================================================
   Admin Dashboard — Auth + Firestore management
   ========================================================= */
import { auth, db, storage, isAdmin, formatDate, formatDateTime, timeAgo,
         onAuthStateChanged, signInWithEmailAndPassword, signOut,
         collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
         query, where, orderBy, limit, startAfter, serverTimestamp,
         ref, uploadBytesResumable, getDownloadURL, deleteObject }
  from "./firebase.js";
import { COL, UPLOAD, SITE } from "./firebase-config.js";
import { esc, toast, modal, humanSize, clean } from "./main.js";

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ---------------- State ---------------- */
const S = {
  user: null,
  view: "overview",
  apps:      { all: [], page: 1, per: 10, search: "", status: "" },
  requests:  { all: [], page: 1, per: 10, search: "", status: "" },
  jobs:      [],
  portfolio: [],
  stats:     { newApps: 0, totalApps: 0, newReq: 0, activeJobs: 0, completed: 0 }
};

const APP_STATUSES = ["New","Reviewing","Shortlisted","Interview","Selected","Rejected"];
const REQ_STATUSES = ["New","Contacted","Discussion","Proposal","Approved","In Progress","Completed","Cancelled"];

const badgeClass = s => (s || "New").toLowerCase().replace(/\s+/g, "");

/* =========================================================
   Auth gate
   ========================================================= */
function renderLogin(msg = "", type = "error") {
  document.body.innerHTML = `
    <div class="login-screen">
      <form class="login-card" id="loginForm" novalidate>
        <div class="lc-head">
          <div class="login-logo">N</div>
          <h1>${esc(SITE.name)} Admin</h1>
          <p>Sign in with your administrator account.</p>
        </div>
        <div class="form-msg ${msg ? "show " + type : ""}" id="loginMsg">${esc(msg)}</div>
        <div class="field">
          <label for="adminEmail">Email</label>
          <input id="adminEmail" type="email" autocomplete="username" placeholder="admin@example.com" required>
        </div>
        <div class="field">
          <label for="adminPassword">Password</label>
          <input id="adminPassword" type="password" autocomplete="current-password" placeholder="••••••••" required>
        </div>
        <button class="btn btn-primary btn-block btn-lg" type="submit" id="loginBtn">Sign In</button>
        <p style="font-size:.76rem;color:var(--muted-2);text-align:center;line-height:1.6">
          Admin access is restricted. Credentials are never stored in frontend code —
          authentication and authorisation are enforced by Firebase.
        </p>
      </form>
    </div>`;

  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = $("#loginBtn");
    const email = $("#adminEmail").value.trim();
    const pass  = $("#adminPassword").value;
    const msg   = $("#loginMsg");
    msg.className = "form-msg";

    if (!email || !pass) {
      msg.className = "form-msg show error";
      msg.textContent = "Please enter both email and password.";
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Signing in…`;
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      /* onAuthStateChanged handles the rest */
    } catch (err) {
      const map = {
        "auth/invalid-credential": "Invalid email or password.",
        "auth/user-not-found":     "No account found with that email.",
        "auth/wrong-password":     "Incorrect password.",
        "auth/too-many-requests":  "Too many attempts. Please wait a few minutes and try again.",
        "auth/invalid-email":      "Please enter a valid email address."
      };
      msg.className = "form-msg show error";
      msg.textContent = map[err?.code] || "Sign-in failed. Please try again.";
      btn.disabled = false;
      btn.textContent = "Sign In";
    }
  });
}

function renderDenied(email) {
  document.body.innerHTML = `
    <div class="login-screen">
      <div class="login-card" style="text-align:center">
        <div class="lc-head">
          <div class="login-logo" style="background:rgba(239,68,68,.16);color:#FCA5A5">!</div>
          <h1>Access Denied</h1>
          <p>The account <strong>${esc(email)}</strong> does not have administrator privileges.</p>
        </div>
        <p style="font-size:.83rem;color:var(--muted);line-height:1.65">
          If you believe this is an error, ask an existing administrator to grant your account
          the <code>admin</code> custom claim or add your UID to the <code>admins</code> collection.
        </p>
        <button class="btn btn-secondary btn-block" id="deniedSignOut">Sign Out</button>
      </div>
    </div>`;
  $("#deniedSignOut").addEventListener("click", () => signOut(auth));
}

onAuthStateChanged(auth, async user => {
  if (!user) { S.user = null; renderLogin(); return; }

  const ok = await isAdmin(user.uid);
  if (!ok) { renderDenied(user.email || "this account"); return; }

  S.user = user;
  renderShell();
  await refreshAll();
});

/* =========================================================
   Shell
   ========================================================= */
const ICONS = {
  grid:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>`,
  inbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  brief: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="m21 15-5-5L5 21"/></svg>`,
  out:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>`,
  menu:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
  eye:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
  edit:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
  plus:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  refresh:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>`
};

function renderShell() {
  document.body.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-side" id="adminSide">
        <div class="admin-brand">
          <span class="brand-mark" style="width:30px;height:30px;border-radius:9px;background:var(--grad);display:grid;place-items:center;color:#fff;font-weight:800;font-size:.82rem">N</span>
          ${esc(SITE.name)} Admin
        </div>
        <nav class="admin-nav">
          <button data-view="overview" class="active">${ICONS.grid} Overview</button>
          <button data-view="applications">${ICONS.users} Applications <span class="badge new" id="badgeApps" style="margin-left:auto"></span></button>
          <button data-view="requests">${ICONS.inbox} Service Requests <span class="badge new" id="badgeReq" style="margin-left:auto"></span></button>
          <button data-view="jobs">${ICONS.brief} Jobs</button>
          <button data-view="portfolio">${ICONS.image} Portfolio</button>
        </nav>
        <div class="admin-side-foot">
          <div class="admin-user">
            <span class="au-av">${esc((S.user?.email || "A").slice(0,1).toUpperCase())}</span>
            <div class="au-info">
              <div class="au-name">${esc(S.user?.email || "Administrator")}</div>
              <div class="au-role">Administrator</div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm btn-block" id="signOutBtn">${ICONS.out} Sign Out</button>
          <a class="btn btn-ghost btn-sm btn-block" href="index.html">View Website</a>
        </div>
      </aside>

      <main class="admin-main">
        <header class="admin-topbar">
          <button class="admin-menu-btn" id="adminMenuBtn" aria-label="Toggle menu">${ICONS.menu}</button>
          <div>
            <h1 id="adminTitle">Overview</h1>
            <div class="at-sub" id="adminSub">Live data from Firestore</div>
          </div>
          <div class="admin-topbar-actions">
            <button class="btn btn-secondary btn-sm" id="refreshBtn">${ICONS.refresh} Refresh</button>
          </div>
        </header>
        <div class="admin-content" id="adminContent"></div>
      </main>
    </div>

    <div class="admin-drawer" id="adminDrawer">
      <div class="ad-bd" data-adclose></div>
      <div class="ad-panel">
        <div class="ad-head">
          <div style="flex:1">
            <h3 id="adTitle">Details</h3>
            <div class="ad-sub" id="adSub"></div>
          </div>
          <button class="icon-btn" data-adclose aria-label="Close">✕</button>
        </div>
        <div class="ad-body" id="adBody"></div>
      </div>
    </div>

    <div class="admin-scrim" id="adminScrim"></div>`;

  /* nav */
  $$(".admin-nav button").forEach(b => b.addEventListener("click", () => switchView(b.dataset.view)));
  $("#signOutBtn").addEventListener("click", async () => {
    const ok = await modal({
      title: "Sign out?",
      body: "You will be returned to the sign-in screen.",
      confirmText: "Sign Out", danger: true
    });
    if (ok) signOut(auth);
  });
  $("#refreshBtn").addEventListener("click", refreshAll);

  /* mobile menu */
  const side = $("#adminSide"), scrim = $("#adminScrim");
  $("#adminMenuBtn").addEventListener("click", () => {
    side.classList.add("open"); scrim.classList.add("show");
  });
  scrim.addEventListener("click", () => {
    side.classList.remove("open"); scrim.classList.remove("show");
  });

  /* drawer */
  $$("[data-adclose]").forEach(el =>
    el.addEventListener("click", () => $("#adminDrawer").classList.remove("open")));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") $("#adminDrawer").classList.remove("open");
  });
}

function switchView(view) {
  S.view = view;
  $$(".admin-nav button").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  const titles = {
    overview: ["Overview", "Live data from Firestore"],
    applications: ["Job Applications", "Review, shortlist and manage candidates"],
    requests: ["Service Requests", "Client enquiries and project briefs"],
    jobs: ["Job Management", "Create and publish open positions"],
    portfolio: ["Portfolio Management", "Publish and organise case studies"]
  };
  $("#adminTitle").textContent = titles[view][0];
  $("#adminSub").textContent   = titles[view][1];
  renderView();
}

/* =========================================================
   Data loading
   ========================================================= */
async function refreshAll() {
  const content = $("#adminContent");
  if (content) content.innerHTML = `<div class="skeleton skeleton-card" style="height:200px"></div>`;

  await Promise.all([loadApplications(), loadRequests(), loadJobs(), loadPortfolio()]);
  computeStats();
  updateBadges();
  renderView();
  toast("Dashboard refreshed.", "success", "", 2200);
}

async function loadApplications() {
  try {
    const snap = await getDocs(query(
      collection(db, COL.jobApplications), orderBy("createdAt", "desc"), limit(500)));
    S.apps.all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("[Admin] applications:", e);
    S.apps.all = [];
    if (e?.code === "failed-precondition")
      toast("Applications need a Firestore index.", "warn", "Index required", 8000);
  }
}

async function loadRequests() {
  try {
    const snap = await getDocs(query(
      collection(db, COL.serviceRequests), orderBy("createdAt", "desc"), limit(500)));
    S.requests.all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("[Admin] requests:", e);
    S.requests.all = [];
    if (e?.code === "failed-precondition")
      toast("Service requests need a Firestore index.", "warn", "Index required", 8000);
  }
}

async function loadJobs() {
  try {
    const snap = await getDocs(query(collection(db, COL.jobs), orderBy("createdAt", "desc")));
    S.jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("[Admin] jobs:", e);
    S.jobs = [];
    if (e?.code === "failed-precondition")
      toast("Jobs need a Firestore index.", "warn", "Index required", 8000);
  }
}

async function loadPortfolio() {
  try {
    const snap = await getDocs(query(collection(db, COL.portfolio), orderBy("createdAt", "desc")));
    S.portfolio = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("[Admin] portfolio:", e);
    S.portfolio = [];
    if (e?.code === "failed-precondition")
      toast("Portfolio needs a Firestore index.", "warn", "Index required", 8000);
  }
}

function computeStats() {
  S.stats.newApps    = S.apps.all.filter(a => (a.status || "New") === "New").length;
  S.stats.totalApps  = S.apps.all.length;
  S.stats.newReq     = S.requests.all.filter(r => (r.status || "New") === "New").length;
  S.stats.activeJobs = S.jobs.filter(j => j.published === true).length;
  S.stats.completed  = S.requests.all.filter(r => r.status === "Completed").length;
}

function updateBadges() {
  const a = $("#badgeApps"), r = $("#badgeReq");
  if (a) { a.textContent = S.stats.newApps || ""; a.style.display = S.stats.newApps ? "" : "none"; }
  if (r) { r.textContent = S.stats.newReq  || ""; r.style.display = S.stats.newReq  ? "" : "none"; }
}

/* =========================================================
   Views
   ========================================================= */
function renderView() {
  const c = $("#adminContent");
  if (!c) return;
  if (S.view === "overview")     c.innerHTML = viewOverview();
  if (S.view === "applications") { c.innerHTML = viewApplications(); wireApplications(); }
  if (S.view === "requests")     { c.innerHTML = viewRequests();     wireRequests(); }
  if (S.view === "jobs")         { c.innerHTML = viewJobs();         wireJobs(); }
  if (S.view === "portfolio")    { c.innerHTML = viewPortfolio();    wirePortfolio(); }
}

/* ---------- Overview ---------- */
function viewOverview() {
  const s = S.stats;
  const recent = [...S.apps.all].slice(0, 5);
  const recentReq = [...S.requests.all].slice(0, 5);

  const card = (label, value, sub) => `
    <div class="as-card">
      <div class="as-ico">${ICONS.grid}</div>
      <div class="as-val">${value}</div>
      <div class="as-lbl">${esc(label)}</div>
      ${sub ? `<div class="as-lbl" style="color:var(--muted-2);font-size:.72rem">${esc(sub)}</div>` : ""}
    </div>`;

  return `
    <div class="admin-stats">
      ${card("New Applications", s.newApps)}
      ${card("Total Applications", s.totalApps)}
      ${card("New Service Requests", s.newReq)}
      ${card("Active Jobs", s.activeJobs)}
      ${card("Completed Projects", s.completed)}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px" class="ov-grid">
      <section class="table-wrap">
        <div class="admin-toolbar" style="border-bottom:1px solid var(--border)">
          <strong style="font-size:.9rem">Recent Applications</strong>
        </div>
        ${recent.length ? `
          <div class="table-scroll">
            <table class="admin-table" style="min-width:auto">
              <tbody>
                ${recent.map(a => `
                  <tr>
                    <td>
                      <div class="cell-strong">${esc(a.name || "—")}</div>
                      <div class="cell-sub">${esc(a.jobTitle || "—")}</div>
                    </td>
                    <td style="text-align:right">
                      <span class="badge ${badgeClass(a.status)}">${esc(a.status || "New")}</span>
                      <div class="cell-sub">${esc(timeAgo(a.createdAt))}</div>
                    </td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="empty-state" style="border:0;background:none;padding:40px 20px">
             <p style="color:var(--muted)">No applications yet.</p></div>`}
      </section>

      <section class="table-wrap">
        <div class="admin-toolbar" style="border-bottom:1px solid var(--border)">
          <strong style="font-size:.9rem">Recent Service Requests</strong>
        </div>
        ${recentReq.length ? `
          <div class="table-scroll">
            <table class="admin-table" style="min-width:auto">
              <tbody>
                ${recentReq.map(r => `
                  <tr>
                    <td>
                      <div class="cell-strong">${esc(r.name || "—")}</div>
                      <div class="cell-sub">${esc(r.service || "—")}</div>
                    </td>
                    <td style="text-align:right">
                      <span class="badge ${badgeClass(r.status)}">${esc(r.status || "New")}</span>
                      <div class="cell-sub">${esc(timeAgo(r.createdAt))}</div>
                    </td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="empty-state" style="border:0;background:none;padding:40px 20px">
             <p style="color:var(--muted)">No service requests yet.</p></div>`}
      </section>
    </div>

    <style>@media(max-width:1024px){.ov-grid{grid-template-columns:1fr!important}}</style>`;
}

/* ---------- Applications ---------- */
function paginate(list, page, per) {
  const start = (page - 1) * per;
  return { rows: list.slice(start, start + per), pages: Math.max(1, Math.ceil(list.length / per)) };
}

function filterList(list, search, status, fields) {
  const term = search.trim().toLowerCase();
  return list.filter(item => {
    const statusOk = !status || (item.status || "New") === status;
    if (!statusOk) return false;
    if (!term) return true;
    return fields.some(f => String(item[f] || "").toLowerCase().includes(term));
  });
}

function viewApplications() {
  const filtered = filterList(S.apps.all, S.apps.search, S.apps.status,
    ["name","email","phone","jobTitle","skills"]);
  const { rows, pages } = paginate(filtered, S.apps.page, S.apps.per);

  return `
    <div class="table-wrap">
      <div class="admin-toolbar">
        <div class="admin-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" id="appSearch" placeholder="Search name, email, role, skills…" value="${esc(S.apps.search)}">
        </div>
        <select class="admin-select" id="appStatusFilter">
          <option value="">All statuses</option>
          ${APP_STATUSES.map(s => `<option value="${s}"${S.apps.status === s ? " selected" : ""}>${s}</option>`).join("")}
        </select>
        <span style="font-size:.8rem;color:var(--muted-2);margin-left:auto">${filtered.length} record${filtered.length === 1 ? "" : "s"}</span>
      </div>

      ${rows.length ? `
        <div class="table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Applicant</th><th>Job Role</th><th>Experience</th>
                <th>Date</th><th>Status</th><th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(a => `
                <tr>
                  <td>
                    <div class="cell-strong">${esc(a.name || "—")}</div>
                    <div class="cell-sub">${esc(a.email || "")}</div>
                  </td>
                  <td>${esc(a.jobTitle || "—")}</td>
                  <td>${esc(a.experienceLevel || a.years || "—")}</td>
                  <td>${esc(formatDate(a.createdAt))}<div class="cell-sub">${esc(timeAgo(a.createdAt))}</div></td>
                  <td><span class="badge ${badgeClass(a.status)}">${esc(a.status || "New")}</span></td>
                  <td>
                    <div class="row-actions" style="justify-content:flex-end">
                      <button class="icon-btn" data-view-app="${a.id}" title="View application">${ICONS.eye}</button>
                      <button class="icon-btn danger" data-del-app="${a.id}" title="Delete application">${ICONS.trash}</button>
                    </div>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span>Page ${S.apps.page} of ${pages}</span>
          <div class="page-btns">
            <button data-app-page="prev" ${S.apps.page <= 1 ? "disabled" : ""}>Prev</button>
            ${Array.from({ length: Math.min(pages, 5) }, (_, i) => {
              const p = Math.max(1, Math.min(pages - 4, S.apps.page - 2)) + i;
              if (p > pages) return "";
              return `<button data-app-page="${p}" class="${p === S.apps.page ? "active" : ""}">${p}</button>`;
            }).join("")}
            <button data-app-page="next" ${S.apps.page >= pages ? "disabled" : ""}>Next</button>
          </div>
        </div>
      ` : `
        <div class="empty-state" style="border:0;border-radius:0;background:none">
          <div class="es-icon">${ICONS.users}</div>
          <h3>No applications found</h3>
          <p>${S.apps.search || S.apps.status ? "Try adjusting your search or filters." : "Applications submitted through the careers page will appear here."}</p>
        </div>`}
    </div>`;
}

function wireApplications() {
  const si = $("#appSearch");
  if (si) {
    let t;
    si.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => { S.apps.search = si.value; S.apps.page = 1; renderView(); }, 250);
    });
  }
  const sf = $("#appStatusFilter");
  if (sf) sf.addEventListener("change", () => { S.apps.status = sf.value; S.apps.page = 1; renderView(); });

  $$("[data-app-page]").forEach(b => b.addEventListener("click", () => {
    const v = b.dataset.appPage;
    if (v === "prev") S.apps.page = Math.max(1, S.apps.page - 1);
    else if (v === "next") S.apps.page += 1;
    else S.apps.page = Number(v);
    renderView();
    $("#adminContent")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  $$("[data-view-app]").forEach(b =>
    b.addEventListener("click", () => openApplication(b.dataset.viewApp)));
  $$("[data-del-app]").forEach(b =>
    b.addEventListener("click", () => deleteApplication(b.dataset.delApp)));
}

function openApplication(id) {
  const a = S.apps.all.find(x => x.id === id);
  if (!a) return;

  const link = (url, label) => url
    ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label || url)}</a>` : "—";

  $("#adTitle").textContent = a.name || "Application";
  $("#adSub").textContent = `${a.jobTitle || "—"} · ${formatDateTime(a.createdAt)}`;

  $("#adBody").innerHTML = `
    <div class="ad-section">
      <h4>Contact</h4>
      <dl class="kv">
        <div class="kv-row"><dt>Email</dt><dd>${link("mailto:" + (a.email || ""), a.email)}</dd></div>
        <div class="kv-row"><dt>Phone / WhatsApp</dt><dd>${esc(a.phone || "—")}</dd></div>
        <div class="kv-row"><dt>Location</dt><dd>${esc(a.location || "—")}</dd></div>
        <div class="kv-row"><dt>Reference</dt><dd><strong>#${esc(a.refId || a.id)}</strong></dd></div>
      </dl>
    </div>

    <div class="ad-section">
      <h4>Position</h4>
      <dl class="kv">
        <div class="kv-row"><dt>Role</dt><dd>${esc(a.jobTitle || "—")}</dd></div>
        <div class="kv-row"><dt>Employment Type</dt><dd>${esc(a.employmentType || "—")}</dd></div>
        <div class="kv-row"><dt>Availability</dt><dd>${esc(a.availability || "—")}</dd></div>
        <div class="kv-row"><dt>Experience</dt><dd>${esc(a.experienceLevel || a.years || "—")}</dd></div>
      </dl>
    </div>

    <div class="ad-section">
      <h4>Professional</h4>
      <dl class="kv">
        <div class="kv-row"><dt>Skills</dt><dd>${esc(a.skills || "—")}</dd></div>
        <div class="kv-row"><dt>Portfolio</dt><dd>${link(a.portfolioUrl, "Open portfolio")}</dd></div>
        <div class="kv-row"><dt>LinkedIn</dt><dd>${link(a.linkedinUrl, "Open LinkedIn")}</dd></div>
        <div class="kv-row"><dt>GitHub</dt><dd>${link(a.githubUrl, "Open GitHub")}</dd></div>
        <div class="kv-row"><dt>Website</dt><dd>${link(a.websiteUrl, "Open website")}</dd></div>
      </dl>
    </div>

    <div class="ad-section">
      <h4>Documents</h4>
      <div class="row-actions">
        ${a.resumeUrl ? `<a class="btn btn-secondary btn-sm" href="${esc(a.resumeUrl)}" target="_blank" rel="noopener noreferrer">View / Download Resume</a>` : `<span style="color:var(--muted-2);font-size:.85rem">No resume attached.</span>`}
        ${a.extraDocUrl ? `<a class="btn btn-ghost btn-sm" href="${esc(a.extraDocUrl)}" target="_blank" rel="noopener noreferrer">Additional Document</a>` : ""}
      </div>
    </div>

    ${a.coverMessage ? `
      <div class="ad-section">
        <h4>Cover Message</h4>
        <p style="color:var(--muted);font-size:.88rem;line-height:1.7;white-space:pre-wrap">${esc(a.coverMessage)}</p>
      </div>` : ""}

    ${a.notes ? `
      <div class="ad-section">
        <h4>Additional Notes</h4>
        <p style="color:var(--muted);font-size:.88rem;line-height:1.7;white-space:pre-wrap">${esc(a.notes)}</p>
      </div>` : ""}

    <div class="ad-section">
      <h4>Status</h4>
      <select class="admin-select" id="appStatusSelect" style="width:100%">
        ${APP_STATUSES.map(s => `<option value="${s}"${(a.status || "New") === s ? " selected" : ""}>${s}</option>`).join("")}
      </select>
      <button class="btn btn-primary btn-sm" id="appSaveStatus" style="margin-top:10px">Update Status</button>
    </div>

    <div class="ad-section">
      <h4>Internal Notes</h4>
      <textarea class="notes-area" id="appAdminNotes" placeholder="Notes visible only to administrators…">${esc(a.adminNotes || "")}</textarea>
      <button class="btn btn-secondary btn-sm" id="appSaveNotes" style="margin-top:10px">Save Notes</button>
    </div>

    <div class="ad-section">
      <h4>Danger Zone</h4>
      <button class="btn btn-danger btn-sm" id="appDelete">Delete Application</button>
    </div>`;

  $("#adminDrawer").classList.add("open");

  $("#appSaveStatus").addEventListener("click", async () => {
    const status = $("#appStatusSelect").value;
    try {
      await updateDoc(doc(db, COL.jobApplications, id), { status, updatedAt: serverTimestamp() });
      a.status = status; computeStats(); updateBadges(); renderView();
      toast("Status updated.", "success");
    } catch (e) { toast(e.message || "Update failed.", "error"); }
  });

  $("#appSaveNotes").addEventListener("click", async () => {
    const adminNotes = clean($("#appAdminNotes").value, 4000);
    try {
      await updateDoc(doc(db, COL.jobApplications, id), { adminNotes, updatedAt: serverTimestamp() });
      a.adminNotes = adminNotes;
      toast("Notes saved.", "success");
    } catch (e) { toast(e.message || "Save failed.", "error"); }
  });

  $("#appDelete").addEventListener("click", async () => {
    const ok = await modal({
      title: "Delete this application?",
      body: `The application from <strong>${esc(a.name || "this applicant")}</strong> will be permanently removed. This action cannot be undone.`,
      confirmText: "Delete", danger: true
    });
    if (!ok) return;
    try {
      /* remove resume from storage if present */
      if (a.resumeUrl) {
        try { await deleteObject(ref(storage, a.resumeUrl)); } catch {}
      }
      await deleteDoc(doc(db, COL.jobApplications, id));
      S.apps.all = S.apps.all.filter(x => x.id !== id);
      $("#adminDrawer").classList.remove("open");
      computeStats(); updateBadges(); renderView();
      toast("Application deleted.", "success");
    } catch (e) { toast(e.message || "Delete failed.", "error"); }
  });
}

async function deleteApplication(id) {
  const a = S.apps.all.find(x => x.id === id);
  if (!a) return;
  const ok = await modal({
    title: "Delete application?",
    body: `This will permanently remove the application from <strong>${esc(a.name || "this applicant")}</strong>.`,
    confirmText: "Delete", danger: true
  });
  if (!ok) return;
  try {
    await deleteDoc(doc(db, COL.jobApplications, id));
    S.apps.all = S.apps.all.filter(x => x.id !== id);
    computeStats(); updateBadges(); renderView();
    toast("Application deleted.", "success");
  } catch (e) { toast(e.message || "Delete failed.", "error"); }
}

/* ---------- Service Requests ---------- */
function viewRequests() {
  const filtered = filterList(S.requests.all, S.requests.search, S.requests.status,
    ["name","email","service","company","projectTitle"]);
  const { rows, pages } = paginate(filtered, S.requests.page, S.requests.per);

  return `
    <div class="table-wrap">
      <div class="admin-toolbar">
        <div class="admin-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" id="reqSearch" placeholder="Search client, service, company…" value="${esc(S.requests.search)}">
        </div>
        <select class="admin-select" id="reqStatusFilter">
          <option value="">All statuses</option>
          ${REQ_STATUSES.map(s => `<option value="${s}"${S.requests.status === s ? " selected" : ""}>${s}</option>`).join("")}
        </select>
        <span style="font-size:.8rem;color:var(--muted-2);margin-left:auto">${filtered.length} record${filtered.length === 1 ? "" : "s"}</span>
      </div>

      ${rows.length ? `
        <div class="table-scroll">
          <table class="admin-table">
            <thead>
              <tr><th>Client</th><th>Service</th><th>Company</th><th>Date</th><th>Budget</th><th>Status</th><th style="text-align:right">Actions</th></tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td><div class="cell-strong">${esc(r.name || "—")}</div><div class="cell-sub">${esc(r.email || "")}</div></td>
                  <td>${esc(r.service || "—")}</td>
                  <td>${esc(r.company || "—")}</td>
                  <td>${esc(formatDate(r.createdAt))}<div class="cell-sub">${esc(timeAgo(r.createdAt))}</div></td>
                  <td>${esc(r.budget || "—")}</td>
                  <td><span class="badge ${badgeClass(r.status)}">${esc(r.status || "New")}</span></td>
                  <td>
                    <div class="row-actions" style="justify-content:flex-end">
                      <button class="icon-btn" data-view-req="${r.id}" title="View request">${ICONS.eye}</button>
                      <button class="icon-btn danger" data-del-req="${r.id}" title="Delete request">${ICONS.trash}</button>
                    </div>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <span>Page ${S.requests.page} of ${pages}</span>
          <div class="page-btns">
            <button data-req-page="prev" ${S.requests.page <= 1 ? "disabled" : ""}>Prev</button>
            ${Array.from({ length: Math.min(pages, 5) }, (_, i) => {
              const p = Math.max(1, Math.min(pages - 4, S.requests.page - 2)) + i;
              if (p > pages) return "";
              return `<button data-req-page="${p}" class="${p === S.requests.page ? "active" : ""}">${p}</button>`;
            }).join("")}
            <button data-req-page="next" ${S.requests.page >= pages ? "disabled" : ""}>Next</button>
          </div>
        </div>`
      : `<div class="empty-state" style="border:0;border-radius:0;background:none">
           <div class="es-icon">${ICONS.inbox}</div>
           <h3>No service requests found</h3>
           <p>${S.requests.search || S.requests.status ? "Try adjusting your filters." : "Requests submitted through the Hire Us page will appear here."}</p>
         </div>`}
    </div>`;
}

function wireRequests() {
  const si = $("#reqSearch");
  if (si) {
    let t;
    si.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => { S.requests.search = si.value; S.requests.page = 1; renderView(); }, 250);
    });
  }
  const sf = $("#reqStatusFilter");
  if (sf) sf.addEventListener("change", () => { S.requests.status = sf.value; S.requests.page = 1; renderView(); });

  $$("[data-req-page]").forEach(b => b.addEventListener("click", () => {
    const v = b.dataset.reqPage;
    if (v === "prev") S.requests.page = Math.max(1, S.requests.page - 1);
    else if (v === "next") S.requests.page += 1;
    else S.requests.page = Number(v);
    renderView();
  }));

  $$("[data-view-req]").forEach(b => b.addEventListener("click", () => openRequest(b.dataset.viewReq)));
  $$("[data-del-req]").forEach(b => b.addEventListener("click", () => deleteRequest(b.dataset.delReq)));
}

function openRequest(id) {
  const r = S.requests.all.find(x => x.id === id);
  if (!r) return;

  $("#adTitle").textContent = r.name || "Service Request";
  $("#adSub").textContent = `${r.service || "—"} · ${formatDateTime(r.createdAt)}`;

  const links = Array.isArray(r.links) ? r.links : [];
  const files = Array.isArray(r.fileUrls) ? r.fileUrls : [];

  $("#adBody").innerHTML = `
    <div class="ad-section">
      <h4>Client</h4>
      <dl class="kv">
        <div class="kv-row"><dt>Name</dt><dd>${esc(r.name || "—")}</dd></div>
        <div class="kv-row"><dt>Email</dt><dd><a href="mailto:${esc(r.email || "")}">${esc(r.email || "—")}</a></dd></div>
        <div class="kv-row"><dt>Phone</dt><dd>${esc(r.phone || "—")}</dd></div>
        <div class="kv-row"><dt>Company</dt><dd>${esc(r.company || "—")}</dd></div>
        <div class="kv-row"><dt>Reference</dt><dd><strong>#${esc(r.refId || r.id)}</strong></dd></div>
      </dl>
    </div>

    <div class="ad-section">
      <h4>Project</h4>
      <dl class="kv">
        <div class="kv-row"><dt>Service</dt><dd>${esc(r.service || "—")}</dd></div>
        <div class="kv-row"><dt>Secondary</dt><dd>${esc(r.secondaryService || "—")}</dd></div>
        <div class="kv-row"><dt>Title</dt><dd>${esc(r.projectTitle || "—")}</dd></div>
        <div class="kv-row"><dt>Budget</dt><dd>${esc(r.budget || "—")}</dd></div>
        <div class="kv-row"><dt>Timeline</dt><dd>${esc(r.timeline || "—")}</dd></div>
      </dl>
    </div>

    <div class="ad-section">
      <h4>Description</h4>
      <p style="color:var(--muted);font-size:.88rem;line-height:1.7;white-space:pre-wrap">${esc(r.description || "—")}</p>
    </div>

    ${links.length ? `
      <div class="ad-section">
        <h4>Online Presence</h4>
        <dl class="kv">
          ${links.map(l => `<div class="kv-row"><dt>${esc(l.label || "Link")}</dt><dd><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.url)}</a></dd></div>`).join("")}
        </dl>
      </div>` : ""}

    ${r.referenceLinks ? `
      <div class="ad-section">
        <h4>Reference Links</h4>
        <p style="color:var(--muted);font-size:.85rem;white-space:pre-wrap;word-break:break-word">${esc(r.referenceLinks)}</p>
      </div>` : ""}

    ${r.additionalRequirements ? `
      <div class="ad-section">
        <h4>Additional Requirements</h4>
        <p style="color:var(--muted);font-size:.85rem;white-space:pre-wrap">${esc(r.additionalRequirements)}</p>
      </div>` : ""}

    ${files.length ? `
      <div class="ad-section">
        <h4>Files</h4>
        <div class="row-actions">
          ${files.map(f => `<a class="btn btn-ghost btn-sm" href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.name || "File")}</a>`).join("")}
        </div>
      </div>` : ""}

    <div class="ad-section">
      <h4>Status</h4>
      <select class="admin-select" id="reqStatusSelect" style="width:100%">
        ${REQ_STATUSES.map(s => `<option value="${s}"${(r.status || "New") === s ? " selected" : ""}>${s}</option>`).join("")}
      </select>
      <button class="btn btn-primary btn-sm" id="reqSaveStatus" style="margin-top:10px">Update Status</button>
    </div>

    <div class="ad-section">
      <h4>Internal Notes</h4>
      <textarea class="notes-area" id="reqAdminNotes" placeholder="Internal notes…">${esc(r.adminNotes || "")}</textarea>
      <button class="btn btn-secondary btn-sm" id="reqSaveNotes" style="margin-top:10px">Save Notes</button>
    </div>

    <div class="ad-section">
      <h4>Danger Zone</h4>
      <button class="btn btn-danger btn-sm" id="reqDelete">Delete Request</button>
    </div>`;

  $("#adminDrawer").classList.add("open");

  $("#reqSaveStatus").addEventListener("click", async () => {
    const status = $("#reqStatusSelect").value;
    try {
      await updateDoc(doc(db, COL.serviceRequests, id), { status, updatedAt: serverTimestamp() });
      r.status = status; computeStats(); updateBadges(); renderView();
      toast("Status updated.", "success");
    } catch (e) { toast(e.message || "Update failed.", "error"); }
  });

  $("#reqSaveNotes").addEventListener("click", async () => {
    const adminNotes = clean($("#reqAdminNotes").value, 4000);
    try {
      await updateDoc(doc(db, COL.serviceRequests, id), { adminNotes, updatedAt: serverTimestamp() });
      r.adminNotes = adminNotes;
      toast("Notes saved.", "success");
    } catch (e) { toast(e.message || "Save failed.", "error"); }
  });

  $("#reqDelete").addEventListener("click", async () => {
    const ok = await modal({
      title: "Delete this request?",
      body: `The request from <strong>${esc(r.name || "this client")}</strong> will be permanently removed.`,
      confirmText: "Delete", danger: true
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, COL.serviceRequests, id));
      S.requests.all = S.requests.all.filter(x => x.id !== id);
      $("#adminDrawer").classList.remove("open");
      computeStats(); updateBadges(); renderView();
      toast("Request deleted.", "success");
    } catch (e) { toast(e.message || "Delete failed.", "error"); }
  });
}

async function deleteRequest(id) {
  const r = S.requests.all.find(x => x.id === id);
  if (!r) return;
  const ok = await modal({
    title: "Delete service request?",
    body: `This will permanently remove the request from <strong>${esc(r.name || "this client")}</strong>.`,
    confirmText: "Delete", danger: true
  });
  if (!ok) return;
  try {
    await deleteDoc(doc(db, COL.serviceRequests, id));
    S.requests.all = S.requests.all.filter(x => x.id !== id);
    computeStats(); updateBadges(); renderView();
    toast("Request deleted.", "success");
  } catch (e) { toast(e.message || "Delete failed.", "error"); }
}

/* ---------- Jobs ---------- */
function viewJobs() {
  return `
    <div class="admin-panel" style="display:block">
      <div class="admin-toolbar" style="border-bottom:1px solid var(--border);padding:16px 20px">
        <strong style="font-size:.92rem">All Positions</strong>
        <button class="btn btn-primary btn-sm" id="newJobBtn" style="margin-left:auto">${ICONS.plus} New Job</button>
      </div>

      ${S.jobs.length ? `
        <div class="table-scroll">
          <table class="admin-table">
            <thead><tr><th>Title</th><th>Department</th><th>Type</th><th>Mode</th><th>Posted</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
              ${S.jobs.map(j => `
                <tr>
                  <td><div class="cell-strong">${esc(j.title || "—")}</div><div class="cell-sub">${esc(j.experience || "")}</div></td>
                  <td>${esc(j.department || "—")}</td>
                  <td>${esc(j.employmentType || "—")}</td>
                  <td>${esc(j.workMode || "—")}</td>
                  <td>${esc(formatDate(j.createdAt))}</td>
                  <td><span class="badge ${j.published ? "published" : "draft"}">${j.published ? "Published" : "Draft"}</span></td>
                  <td>
                    <div class="row-actions" style="justify-content:flex-end">
                      <button class="icon-btn" data-edit-job="${j.id}" title="Edit">${ICONS.edit}</button>
                      <button class="icon-btn" data-toggle-job="${j.id}" title="${j.published ? "Unpublish" : "Publish"}">${ICONS.eye}</button>
                      <button class="icon-btn danger" data-del-job="${j.id}" title="Delete">${ICONS.trash}</button>
                    </div>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>` : `
        <div class="empty-state" style="border:0;border-radius:0;background:none">
          <div class="es-icon">${ICONS.brief}</div>
          <h3>No jobs created yet</h3>
          <p>Create your first position — it will appear on the public careers page once published.</p>
          <button class="btn btn-primary" id="newJobBtnEmpty">${ICONS.plus} Create Job</button>
        </div>`}
    </div>`;
}

function wireJobs() {
  $("#newJobBtn")?.addEventListener("click", () => openJobEditor());
  $("#newJobBtnEmpty")?.addEventListener("click", () => openJobEditor());
  $$("[data-edit-job]").forEach(b => b.addEventListener("click", () => openJobEditor(b.dataset.editJob)));
  $$("[data-toggle-job]").forEach(b => b.addEventListener("click", () => toggleJob(b.dataset.toggleJob)));
  $$("[data-del-job]").forEach(b => b.addEventListener("click", () => deleteJob(b.dataset.delJob)));
}

function openJobEditor(id = null) {
  const j = id ? S.jobs.find(x => x.id === id) : null;
  const val = (k, d = "") => esc(j?.[k] ?? d);
  const arrVal = k => Array.isArray(j?.[k]) ? j[k].join("\n") : "";

  $("#adTitle").textContent = j ? "Edit Job" : "Create Job";
  $("#adSub").textContent = j ? j.title : "New position";
  $("#adBody").innerHTML = `
    <form id="jobForm" class="admin-form" style="border:0;padding:0;background:none">
      <div class="admin-form-grid">
        <div class="field full"><label>Job Title <span class="req">*</span></label>
          <input name="title" value="${val("title")}" required></div>
        <div class="field"><label>Department</label>
          <input name="department" value="${val("department")}" placeholder="e.g. Creative"></div>
        <div class="field"><label>Employment Type</label>
          <select name="employmentType">
            ${["","Full-time","Part-time","Contract","Freelance","Internship"].map(o =>
              `<option value="${o}"${(j?.employmentType || "") === o ? " selected" : ""}>${o || "—"}</option>`).join("")}
          </select></div>
        <div class="field"><label>Work Mode</label>
          <select name="workMode">
            ${["","Remote","Hybrid","On-site"].map(o =>
              `<option value="${o}"${(j?.workMode || "") === o ? " selected" : ""}>${o || "—"}</option>`).join("")}
          </select></div>
        <div class="field"><label>Location</label>
          <input name="location" value="${val("location")}" placeholder="e.g. Remote / Mumbai"></div>
        <div class="field"><label>Experience</label>
          <input name="experience" value="${val("experience")}" placeholder="e.g. 2–4 years"></div>
        <div class="field"><label>Compensation</label>
          <input name="compensation" value="${val("compensation")}" placeholder="Optional"></div>
        <div class="field full"><label>Short Description</label>
          <textarea name="description" style="min-height:90px">${val("description")}</textarea></div>
        <div class="field full"><label>Responsibilities <span class="opt">one per line</span></label>
          <textarea name="responsibilities" style="min-height:100px">${esc(arrVal("responsibilities"))}</textarea></div>
        <div class="field full"><label>Required Skills <span class="opt">one per line</span></label>
          <textarea name="requirements" style="min-height:100px">${esc(arrVal("requirements"))}</textarea></div>
        <div class="field full"><label>Preferred Skills <span class="opt">one per line</span></label>
          <textarea name="preferred" style="min-height:80px">${esc(arrVal("preferred"))}</textarea></div>
        <div class="field"><label>Application Deadline</label>
          <input name="deadline" type="date" value="${j?.deadline ? new Date(j.deadline.toDate?.() || j.deadline).toISOString().slice(0,10) : ""}"></div>
        <div class="field"><label>Published</label>
          <select name="published">
            <option value="true"${j?.published !== false ? " selected" : ""}>Published</option>
            <option value="false"${j?.published === false ? " selected" : ""}>Draft</option>
          </select></div>
      </div>
      <div class="form-actions-row">
        <button class="btn btn-primary" type="submit" id="saveJobBtn">${j ? "Save Changes" : "Create Job"}</button>
        <button class="btn btn-ghost" type="button" data-adclose>Cancel</button>
      </div>
    </form>`;

  $("#adminDrawer").classList.add("open");
  $$("[data-adclose]").forEach(el =>
    el.addEventListener("click", () => $("#adminDrawer").classList.remove("open")));

  $("#jobForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target;
    const btn = $("#saveJobBtn");
    const toLines = v => String(v || "").split("\n").map(s => s.trim()).filter(Boolean);

    const data = {
      title: clean(f.title.value, 160),
      department: clean(f.department.value, 80),
      employmentType: clean(f.employmentType.value, 40),
      workMode: clean(f.workMode.value, 40),
      location: clean(f.location.value, 120),
      experience: clean(f.experience.value, 60),
      compensation: clean(f.compensation.value, 120),
      description: clean(f.description.value, 2000),
      responsibilities: toLines(f.responsibilities.value),
      requirements: toLines(f.requirements.value),
      preferred: toLines(f.preferred.value),
      published: f.published.value === "true",
      updatedAt: serverTimestamp()
    };
    if (f.deadline.value) data.deadline = new Date(f.deadline.value + "T23:59:59");

    if (!data.title) { toast("Job title is required.", "error"); return; }

    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Saving…`;
    try {
      if (j) {
        await updateDoc(doc(db, COL.jobs, j.id), data);
        Object.assign(j, data);
        toast("Job updated.", "success");
      } else {
        data.createdAt = serverTimestamp();
        const d = await addDoc(collection(db, COL.jobs), data);
        S.jobs.unshift({ id: d.id, ...data });
        toast("Job created.", "success");
      }
      computeStats(); updateBadges();
      $("#adminDrawer").classList.remove("open");
      renderView();
    } catch (err) {
      toast(err.message || "Save failed.", "error");
      btn.disabled = false; btn.textContent = j ? "Save Changes" : "Create Job";
    }
  });
}

async function toggleJob(id) {
  const j = S.jobs.find(x => x.id === id);
  if (!j) return;
  const next = !j.published;
  const ok = await modal({
    title: next ? "Publish this job?" : "Unpublish this job?",
    body: next
      ? `<strong>${esc(j.title)}</strong> will become visible on the public careers page.`
      : `<strong>${esc(j.title)}</strong> will be hidden from the public careers page. Existing applications are retained.`,
    confirmText: next ? "Publish" : "Unpublish",
    danger: !next
  });
  if (!ok) return;
  try {
    await updateDoc(doc(db, COL.jobs, id), { published: next, updatedAt: serverTimestamp() });
    j.published = next;
    computeStats(); updateBadges(); renderView();
    toast(next ? "Job published." : "Job unpublished.", "success");
  } catch (e) { toast(e.message || "Update failed.", "error"); }
}

async function deleteJob(id) {
  const j = S.jobs.find(x => x.id === id);
  if (!j) return;
  const ok = await modal({
    title: "Delete this job?",
    body: `<strong>${esc(j.title)}</strong> will be permanently removed. Applications already submitted are not affected.`,
    confirmText: "Delete", danger: true
  });
  if (!ok) return;
  try {
    await deleteDoc(doc(db, COL.jobs, id));
    S.jobs = S.jobs.filter(x => x.id !== id);
    computeStats(); updateBadges(); renderView();
    toast("Job deleted.", "success");
  } catch (e) { toast(e.message || "Delete failed.", "error"); }
}

/* ---------- Portfolio ---------- */
function viewPortfolio() {
  const CATS = ["Video","Design","Development","Content","Social Media","Other"];
  return `
    <div class="admin-panel" style="display:block">
      <div class="admin-toolbar" style="border-bottom:1px solid var(--border);padding:16px 20px">
        <strong style="font-size:.92rem">Portfolio Projects</strong>
        <button class="btn btn-primary btn-sm" id="newProjectBtn" style="margin-left:auto">${ICONS.plus} New Project</button>
      </div>

      ${S.portfolio.length ? `
        <div class="table-scroll">
          <table class="admin-table">
            <thead><tr><th>Title</th><th>Category</th><th>Services</th><th>Created</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
              ${S.portfolio.map(p => `
                <tr>
                  <td><div class="cell-strong">${esc(p.title || "—")}</div><div class="cell-sub">${esc((p.description || "").slice(0, 70))}${(p.description || "").length > 70 ? "…" : ""}</div></td>
                  <td>${esc(p.category || "—")}</td>
                  <td>${esc(Array.isArray(p.services) ? p.services.slice(0,2).join(", ") : "—")}</td>
                  <td>${esc(formatDate(p.createdAt))}</td>
                  <td><span class="badge ${p.published ? "published" : "draft"}">${p.published ? "Published" : "Draft"}</span></td>
                  <td>
                    <div class="row-actions" style="justify-content:flex-end">
                      <button class="icon-btn" data-edit-project="${p.id}" title="Edit">${ICONS.edit}</button>
                      <button class="icon-btn" data-toggle-project="${p.id}" title="${p.published ? "Unpublish" : "Publish"}">${ICONS.eye}</button>
                      <button class="icon-btn danger" data-del-project="${p.id}" title="Delete">${ICONS.trash}</button>
                    </div>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>` : `
        <div class="empty-state" style="border:0;border-radius:0;background:none">
          <div class="es-icon">${ICONS.image}</div>
          <h3>No projects published yet</h3>
          <p>Add your first case study. The public portfolio page currently shows demonstration projects until real work is published.</p>
          <button class="btn btn-primary" id="newProjectBtnEmpty">${ICONS.plus} Add Project</button>
        </div>`}
    </div>`;
}

function wirePortfolio() {
  $("#newProjectBtn")?.addEventListener("click", () => openProjectEditor());
  $("#newProjectBtnEmpty")?.addEventListener("click", () => openProjectEditor());
  $$("[data-edit-project]").forEach(b => b.addEventListener("click", () => openProjectEditor(b.dataset.editProject)));
  $$("[data-toggle-project]").forEach(b => b.addEventListener("click", () => toggleProject(b.dataset.toggleProject)));
  $$("[data-del-project]").forEach(b => b.addEventListener("click", () => deleteProject(b.dataset.delProject)));
}

function openProjectEditor(id = null) {
  const p = id ? S.portfolio.find(x => x.id === id) : null;
  const CATS = ["Video","Design","Development","Content","Social Media","Other"];

  $("#adTitle").textContent = p ? "Edit Project" : "New Project";
  $("#adSub").textContent = p ? p.title : "Portfolio case study";
  $("#adBody").innerHTML = `
    <form id="projectForm" class="admin-form" style="border:0;padding:0;background:none">
      <div class="admin-form-grid">
        <div class="field full"><label>Project Title <span class="req">*</span></label>
          <input name="title" value="${esc(p?.title || "")}" required></div>
        <div class="field"><label>Category <span class="req">*</span></label>
          <select name="category">
            ${CATS.map(c => `<option value="${c}"${(p?.category || "") === c ? " selected" : ""}>${c}</option>`).join("")}
          </select></div>
        <div class="field"><label>Project URL</label>
          <input name="url" type="url" value="${esc(p?.url || "")}" placeholder="https://…"></div>
        <div class="field full"><label>Description</label>
          <textarea name="description" style="min-height:110px">${esc(p?.description || "")}</textarea></div>
        <div class="field full"><label>Services Used <span class="opt">comma separated</span></label>
          <input name="services" value="${esc(Array.isArray(p?.services) ? p.services.join(", ") : "")}" placeholder="Video Editing, Motion Graphics"></div>
        <div class="field"><label>Published</label>
          <select name="published">
            <option value="true"${p?.published !== false ? " selected" : ""}>Published</option>
            <option value="false"${p?.published === false ? " selected" : ""}>Draft</option>
          </select></div>
        <div class="field full">
          <label>Project Image <span class="opt">optional</span></label>
          <div class="file-drop" id="projDrop">
            <input type="file" accept="image/png,image/jpeg,image/webp">
            <div class="fd-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="m21 15-5-5L5 21"/></svg>
            </div>
            <strong>Upload thumbnail</strong>
            <span>PNG, JPG or WEBP · max ${humanSize(UPLOAD.maxBytes)}</span>
          </div>
          <div class="file-list"></div>
          ${p?.imageUrl ? `<div style="margin-top:10px"><img src="${esc(p.imageUrl)}" alt="Current thumbnail" style="max-height:110px;border-radius:10px;border:1px solid var(--border)"></div>` : ""}
        </div>
      </div>
      <div class="form-actions-row">
        <button class="btn btn-primary" type="submit" id="saveProjectBtn">${p ? "Save Changes" : "Create Project"}</button>
        <button class="btn btn-ghost" type="button" data-adclose>Cancel</button>
      </div>
    </form>`;

  $("#adminDrawer").classList.add("open");
  $$("[data-adclose]").forEach(el =>
    el.addEventListener("click", () => $("#adminDrawer").classList.remove("open")));

  let pickedFile = null;
  const drop = $("#projDrop");
  const input = drop.querySelector("input");
  drop.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    pickedFile = input.files?.[0] || null;
    const list = drop.parentElement.querySelector(".file-list");
    list.innerHTML = pickedFile
      ? `<div class="file-item"><span class="fi-name">${esc(pickedFile.name)}</span><span class="fi-size">${humanSize(pickedFile.size)}</span></div>`
      : "";
  });

  $("#projectForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target;
    const btn = $("#saveProjectBtn");
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Saving…`;

    try {
      let imageUrl = p?.imageUrl || "";
      if (pickedFile) {
        const path = `portfolio/${Date.now()}_${pickedFile.name.replace(/[^\w.\-]/g, "_")}`;
        const task = uploadBytesResumable(ref(storage, path), pickedFile,
          { contentType: pickedFile.type, cacheControl: "public, max-age=31536000" });
        imageUrl = await new Promise((res, rej) => {
          task.on("state_changed", null, rej, async () => res(await getDownloadURL(task.snapshot.ref)));
        });
      }

      const data = {
        title: clean(f.title.value, 160),
        category: clean(f.category.value, 40),
        description: clean(f.description.value, 3000),
        url: clean(f.url.value, 500),
        services: String(f.services.value || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 8),
        published: f.published.value === "true",
        imageUrl,
        updatedAt: serverTimestamp()
      };

      if (!data.title) { toast("Project title is required.", "error"); btn.disabled = false; btn.textContent = "Save"; return; }

      if (p) {
        await updateDoc(doc(db, COL.portfolio, p.id), data);
        Object.assign(p, data);
        toast("Project updated.", "success");
      } else {
        data.createdAt = serverTimestamp();
        const d = await addDoc(collection(db, COL.portfolio), data);
        S.portfolio.unshift({ id: d.id, ...data });
        toast("Project created.", "success");
      }
      $("#adminDrawer").classList.remove("open");
      renderView();
    } catch (err) {
      toast(err.message || "Save failed.", "error");
      btn.disabled = false; btn.textContent = p ? "Save Changes" : "Create Project";
    }
  });
}

async function toggleProject(id) {
  const p = S.portfolio.find(x => x.id === id);
  if (!p) return;
  const next = !p.published;
  const ok = await modal({
    title: next ? "Publish this project?" : "Unpublish this project?",
    body: next
      ? `<strong>${esc(p.title)}</strong> will appear on the public portfolio page.`
      : `<strong>${esc(p.title)}</strong> will be hidden from the public portfolio page.`,
    confirmText: next ? "Publish" : "Unpublish", danger: !next
  });
  if (!ok) return;
  try {
    await updateDoc(doc(db, COL.portfolio, id), { published: next, updatedAt: serverTimestamp() });
    p.published = next;
    renderView();
    toast(next ? "Project published." : "Project unpublished.", "success");
  } catch (e) { toast(e.message || "Update failed.", "error"); }
}

async function deleteProject(id) {
  const p = S.portfolio.find(x => x.id === id);
  if (!p) return;
  const ok = await modal({
    title: "Delete this project?",
    body: `<strong>${esc(p.title)}</strong> will be permanently removed from the portfolio.`,
    confirmText: "Delete", danger: true
  });
  if (!ok) return;
  try {
    if (p.imageUrl) { try { await deleteObject(ref(storage, p.imageUrl)); } catch {} }
    await deleteDoc(doc(db, COL.portfolio, id));
    S.portfolio = S.portfolio.filter(x => x.id !== id);
    renderView();
    toast("Project deleted.", "success");
  } catch (e) { toast(e.message || "Delete failed.", "error"); }
}