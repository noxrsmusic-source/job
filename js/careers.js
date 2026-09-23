/* =========================================================
   Careers — public job listings from Firestore
   ========================================================= */
import { db, collection, query, where, getDocs, orderBy, formatDate }
  from "./firebase.js";
import { COL } from "./firebase-config.js";
import { esc, observeReveal, toast } from "./main.js";

const EMPTY_HTML = `
  <div class="empty-state" data-reveal>
    <div class="es-icon">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
        <path d="M10 7V5h4v2"/>
      </svg>
    </div>
    <h3>No open positions right now</h3>
    <p>We're not actively hiring for a specific role at the moment, but we always review strong applications.
       Send your details through the general application form and we'll keep you on file.</p>
    <a class="btn btn-primary" href="job-details.html?general=1">Submit a General Application</a>
  </div>`;

function jobCard(job, i) {
  const id = job.id;
  const meta = [
    job.department && `<span class="meta-pill">${esc(job.department)}</span>`,
    job.employmentType && `<span class="meta-pill">${esc(job.employmentType)}</span>`,
    job.workMode && `<span class="meta-pill">${esc(job.workMode)}</span>`,
    job.location && `<span class="meta-pill">${esc(job.location)}</span>`,
    job.experience && `<span class="meta-pill">${esc(job.experience)}</span>`
  ].filter(Boolean).join("");

  return `
    <article class="job-card" data-reveal data-reveal-delay="${i * 55}">
      <div class="job-top">
        <div>
          <h3>${esc(job.title || "Untitled role")}</h3>
          <span class="job-dept">${esc(job.department || "General")}</span>
        </div>
        <a class="btn btn-primary btn-sm" href="job-details.html?id=${encodeURIComponent(id)}">View &amp; Apply</a>
      </div>
      ${job.description ? `<p class="job-desc">${esc(job.description)}</p>` : ""}
      <div class="job-meta">${meta}</div>
      <div class="job-foot">
        <span class="job-date">Posted ${esc(formatDate(job.createdAt || job.postedAt))}</span>
        ${job.deadline ? `<span class="job-date">Apply before ${esc(formatDate(job.deadline))}</span>` : ""}
      </div>
    </article>`;
}

export async function loadJobs(targetSelector, { limitCount = 60 } = {}) {
  const root = document.querySelector(targetSelector);
  if (!root) return;

  root.innerHTML = Array.from({ length: 3 })
    .map(() => `<div class="skeleton skeleton-card" style="height:220px"></div>`).join("");

  try {
    const q = query(
      collection(db, COL.jobs),
      where("published", "==", true),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);

    let jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    /* hide expired */
    const now = Date.now();
    jobs = jobs.filter(j => {
      const dl = j.deadline?.toDate?.() || (j.deadline ? new Date(j.deadline) : null);
      return !dl || dl.getTime() >= now;
    });

    if (!jobs.length) { root.innerHTML = EMPTY_HTML; observeReveal(root); return; }

    root.innerHTML = jobs.slice(0, limitCount).map(jobCard).join("");
    observeReveal(root);
  } catch (err) {
    console.error("[Careers] loadJobs:", err);
    root.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
        </div>
        <h3>Unable to load open positions</h3>
        <p>We couldn't reach the job listings service. Please refresh the page, or send a general application and we'll get back to you.</p>
        <a class="btn btn-secondary" href="job-details.html?general=1">Submit a General Application</a>
      </div>`;
    if (err?.code === "failed-precondition") {
      toast("Job listings need a Firestore index. Check the browser console for the setup link.", "warn", "Index required", 9000);
    }
  }
}

/* ---- Landing page preview of latest roles ---- */
export async function loadFeaturedJobs(targetSelector) {
  const root = document.querySelector(targetSelector);
  if (!root) return;
  try {
    const q = query(collection(db, COL.jobs), where("published", "==", true),
                    orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 3);
    if (!jobs.length) { root.innerHTML = ""; return; }
    root.innerHTML = jobs.map(jobCard).join("");
    observeReveal(root);
  } catch { root.innerHTML = ""; }
}