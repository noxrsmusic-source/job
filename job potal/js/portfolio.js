/* =========================================================
   Portfolio — Firestore-driven with demo fallback
   ========================================================= */
import { db, collection, getDocs, query, where, orderBy } from "./firebase.js";
import { COL } from "./firebase-config.js";
import { esc, observeReveal, toast } from "./main.js";

const DEMO = [
  { id:"d1", title:"Product Launch Video Series", category:"Video", featured:true,
    description:"A six-part short-form video series built for a product launch, covering hooks, feature highlights and a call to action across vertical and horizontal formats.",
    services:["Short-form Editing","Motion Graphics","Subtitles"], url:"", published:true },
  { id:"d2", title:"D2C Brand Identity System", category:"Design", featured:true,
    description:"A complete visual identity with logo system, colour palette, typography scale and reusable social templates for a consumer brand.",
    services:["Brand Identity","Social Creatives","Guidelines"], url:"", published:true },
  { id:"d3", title:"Corporate Website & Admin Panel", category:"Development", featured:true,
    description:"A responsive marketing website paired with a Firebase-backed admin panel for managing enquiries, jobs and portfolio content without developer involvement.",
    services:["Web Development","Firebase","Admin Dashboard"], url:"", published:true },
  { id:"d4", title:"Editorial Content Programme", category:"Content",
    description:"A twelve-week content programme covering long-form articles, landing page copy and a documented tone-of-voice guide.",
    services:["Copywriting","Content Strategy","SEO Structure"], url:"", published:true },
  { id:"d5", title:"Social Media Management — 6 Months", category:"Social Media",
    description:"Full account management across Instagram and LinkedIn including monthly calendars, published content, community engagement and performance reporting.",
    services:["Social Management","Content Calendar","Reporting"], url:"", published:true },
  { id:"d6", title:"Podcast Post-Production Pipeline", category:"Video",
    description:"An end-to-end podcast pipeline covering audio cleanup, video editing, clip extraction for short-form, and consistent episode packaging.",
    services:["Podcast Editing","Audio Cleanup","Clip Extraction"], url:"", published:true },
  { id:"d7", title:"SaaS Marketing Site & Design System", category:"Development",
    description:"A marketing site with a documented component design system, reusable sections and a headless content model.",
    services:["UI Design","Web Development","Design System"], url:"", published:true },
  { id:"d8", title:"Campaign Creative Pack", category:"Design",
    description:"A multi-format campaign pack with static and animated creatives sized for every major ad placement.",
    services:["Graphic Design","Motion Graphics","Ad Creatives"], url:"", published:true },
  { id:"d9", title:"Founder Personal Brand Content", category:"Content",
    description:"A structured content series for a founder-led brand, including scripting, repurposing and platform-specific formatting.",
    services:["Script Writing","Content Repurposing","Strategy"], url:"", published:true }
];

const CATEGORIES = ["All","Video","Design","Development","Content","Social Media"];

let ALL = [];
let activeCat = "All";
let searchTerm = "";

function card(p, i) {
  const thumb = p.imageUrl
    ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.title)} project thumbnail" loading="lazy" decoding="async">`
    : `<span class="pf-ph">${esc((p.title || "P").slice(0, 1))}</span>`;

  return `
    <article class="pf-card" data-cat="${esc(p.category || "Other")}" data-reveal data-reveal-delay="${(i % 6) * 55}">
      <div class="pf-thumb">${thumb}</div>
      <div class="pf-body">
        <span class="pf-cat">${esc(p.category || "Project")}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description || "")}</p>
        ${Array.isArray(p.services) && p.services.length
          ? `<div class="card-tags">${p.services.map(s => `<span class="tag">${esc(s)}</span>`).join("")}</div>`
          : ""}
        ${p.url
          ? `<a class="card-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">
               View Project
               <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
             </a>`
          : `<span class="card-link" style="color:var(--muted-2);cursor:default">Case study available on request</span>`}
      </div>
    </article>`;
}

function apply() {
  const grid = document.querySelector("#portfolioGrid");
  if (!grid) return;

  const filtered = ALL.filter(p => {
    const catOk = activeCat === "All" || (p.category || "").toLowerCase() === activeCat.toLowerCase();
    const term = searchTerm.trim().toLowerCase();
    const searchOk = !term ||
      (p.title || "").toLowerCase().includes(term) ||
      (p.description || "").toLowerCase().includes(term) ||
      (Array.isArray(p.services) ? p.services.join(" ").toLowerCase() : "").includes(term);
    return catOk && searchOk;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="es-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
        </div>
        <h3>No projects match your filters</h3>
        <p>Try a different category or clear the search to see all work.</p>
        <button class="btn btn-secondary" id="clearFilters">Clear Filters</button>
      </div>`;
    document.querySelector("#clearFilters")?.addEventListener("click", () => {
      activeCat = "All"; searchTerm = "";
      const si = document.querySelector("#portfolioSearch"); if (si) si.value = "";
      document.querySelectorAll(".chip").forEach(c =>
        c.classList.toggle("active", c.dataset.cat === "All"));
      apply();
    });
    return;
  }

  grid.innerHTML = filtered.map(card).join("");
  observeReveal(grid);
}

function buildFilters() {
  const bar = document.querySelector("#portfolioFilters");
  if (!bar) return;
  bar.innerHTML = CATEGORIES.map(c =>
    `<button class="chip${c === "All" ? " active" : ""}" data-cat="${esc(c)}" type="button">${esc(c)}</button>`
  ).join("");
  bar.addEventListener("click", e => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    bar.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    activeCat = btn.dataset.cat;
    apply();
  });
}

function buildSearch() {
  const input = document.querySelector("#portfolioSearch");
  if (!input) return;
  let t;
  input.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => { searchTerm = input.value; apply(); }, 220);
  });
}

export async function initPortfolio() {
  const grid = document.querySelector("#portfolioGrid");
  if (!grid) return;

  buildFilters();
  buildSearch();

  grid.innerHTML = Array.from({ length: 6 })
    .map(() => `<div class="skeleton skeleton-card" style="height:320px"></div>`).join("");

  try {
    const q = query(collection(db, COL.portfolio),
                    where("published", "==", true),
                    orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    ALL = docs.length ? docs : DEMO;
    if (!docs.length) {
      const note = document.querySelector("#portfolioNote");
      if (note) note.textContent =
        "Showing demonstration projects. Live case studies will appear here once published from the admin panel.";
    }
  } catch (err) {
    console.warn("[Portfolio] falling back to demo data:", err?.message);
    ALL = DEMO;
    const note = document.querySelector("#portfolioNote");
    if (note) note.textContent =
      "Showing demonstration projects. Live case studies appear here once published from the admin panel.";
    if (err?.code === "failed-precondition") {
      toast("Portfolio needs a Firestore index. Check the console for the setup link.", "warn", "Index required", 8000);
    }
  }

  apply();
}

if (document.querySelector("#portfolioGrid")) initPortfolio();