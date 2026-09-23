/* =========================================================
   Job details page — loads one job, renders the application form
   ========================================================= */
import { db, doc, getDoc, collection, addDoc, serverTimestamp,
         ref, uploadBytesResumable, getDownloadURL, makeRefId }
  from "./firebase.js";
import { COL, UPLOAD, SITE } from "./firebase-config.js";
import { esc, toast, validateForm, bindLiveValidation, validators,
         setFieldError, initFileDrop, createVerifier, humanSize, clean }
  from "./main.js";

const $ = s => document.querySelector(s);
const qs = new URLSearchParams(location.search);

let currentJob = null;

/* ---------------- Job rendering ---------------- */
function renderJob(job) {
  const meta = [
    ["Department", job.department],
    ["Employment Type", job.employmentType],
    ["Work Mode", job.workMode],
    ["Location", job.location],
    ["Experience", job.experience],
    ["Compensation", job.compensation],
    ["Application Deadline", job.deadline ? new Date(job.deadline.toDate?.() || job.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""]
  ].filter(([, v]) => v);

  const list = arr => Array.isArray(arr) && arr.length
    ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p>Not specified for this role.</p>`;

  return `
    <div class="detail-layout">
      <div class="prose">
        <div>
          <span class="job-dept">${esc(job.department || "General")}</span>
          <h1 style="font-size:clamp(1.8rem,4vw,2.7rem);letter-spacing:-.035em;margin-top:10px">${esc(job.title || "Open Position")}</h1>
        </div>

        <div class="job-meta">
          ${job.employmentType ? `<span class="meta-pill">${esc(job.employmentType)}</span>` : ""}
          ${job.workMode ? `<span class="meta-pill">${esc(job.workMode)}</span>` : ""}
          ${job.location ? `<span class="meta-pill">${esc(job.location)}</span>` : ""}
          ${job.experience ? `<span class="meta-pill">${esc(job.experience)}</span>` : ""}
        </div>

        ${job.description ? `<p style="font-size:1rem;line-height:1.75">${esc(job.description)}</p>` : ""}

        <h2>Responsibilities</h2>
        ${list(job.responsibilities)}

        <h2>Required Skills</h2>
        ${list(job.requirements)}

        ${Array.isArray(job.preferred) && job.preferred.length ? `
          <h2>Preferred Skills</h2>${list(job.preferred)}` : ""}

        ${job.about ? `<h2>About the Role</h2><p>${esc(job.about)}</p>` : ""}
      </div>

      <aside class="aside-card">
        <h4>Position Summary</h4>
        <div class="aside-list">
          ${meta.map(([k, v]) => `<div><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}
        </div>
        <a class="btn btn-primary btn-block" href="#apply">Apply for This Position</a>
        <p style="font-size:.78rem;color:var(--muted-2);text-align:center">
          Applications are only accepted through this official form.
        </p>
      </aside>
    </div>`;
}

async function initJobPage() {
  const root = $("#jobRoot");
  if (!root) return;

  const id = qs.get("id");
  const isGeneral = qs.get("general") === "1";

  if (isGeneral || !id) {
    currentJob = { id: "general", title: "General Application", department: "Open Application" };
    root.innerHTML = `
      <div class="prose" style="max-width:760px">
        <span class="pill-badge">General Application</span>
        <h1 style="font-size:clamp(1.9rem,4vw,2.7rem);letter-spacing:-.035em;margin-top:14px">
          No matching role? Apply anyway.
        </h1>
        <p style="font-size:1.02rem">
          We review every strong application even when there isn't an open position that fits.
          Tell us what you do, share your portfolio, and we'll keep your details on file for
          upcoming roles and freelance engagements.
        </p>
      </div>`;
    setupApplicationForm(currentJob);
    return;
  }

  root.innerHTML = `<div class="skeleton skeleton-card" style="height:360px"></div>`;

  try {
    const snap = await getDoc(doc(db, COL.jobs, id));
    if (!snap.exists() || snap.data().published !== true) {
      root.innerHTML = `
        <div class="empty-state">
          <div class="es-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
          </div>
          <h3>This position is no longer available</h3>
          <p>The role may have been filled or unpublished. Browse current openings or submit a general application.</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
            <a class="btn btn-primary" href="careers.html">View Open Positions</a>
            <a class="btn btn-ghost" href="job-details.html?general=1">General Application</a>
          </div>
        </div>`;
      return;
    }

    currentJob = { id: snap.id, ...snap.data() };
    document.title = `${currentJob.title} — Careers | ${SITE.name}`;
    root.innerHTML = renderJob(currentJob);
    setupApplicationForm(currentJob);
  } catch (err) {
    console.error("[Job] load:", err);
    root.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">${""}</div>
        <h3>Unable to load this position</h3>
        <p>Please refresh the page. If the problem continues, submit a general application instead.</p>
        <a class="btn btn-secondary" href="job-details.html?general=1">General Application</a>
      </div>`;
  }
}

/* ---------------- Application form ---------------- */
function setupApplicationForm(job) {
  const wrap = $("#applyFormWrap");
  if (!wrap) return;

  wrap.innerHTML = `
    <form class="form-shell" id="applicationForm" novalidate>
      <div class="form-section">
        <div class="form-section-head">
          <span class="form-section-num">1</span>
          <div><h3>Personal Information</h3><p>How we can reach you.</p></div>
        </div>
        <div class="form-grid">
          <div class="field"><label for="fullName">Full Name <span class="req">*</span></label>
            <input id="fullName" name="fullName" type="text" autocomplete="name" placeholder="Your full name" required>
            <span class="err"></span></div>
          <div class="field"><label for="email">Email <span class="req">*</span></label>
            <input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required>
            <span class="err"></span></div>
          <div class="field"><label for="phone">Phone / WhatsApp <span class="req">*</span></label>
            <input id="phone" name="phone" type="tel" autocomplete="tel" placeholder="+91 00000 00000" required>
            <span class="err"></span></div>
          <div class="field"><label for="location">Location <span class="opt">Optional</span></label>
            <input id="location" name="location" type="text" placeholder="City, Country">
            <span class="err"></span></div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-head">
          <span class="form-section-num">2</span>
          <div><h3>Position</h3><p>The role you're applying for.</p></div>
        </div>
        <div class="form-grid">
          <div class="field full"><label for="jobTitle">Job Role <span class="req">*</span></label>
            <input id="jobTitle" name="jobTitle" type="text" value="${esc(job.title || "")}" required>
            <span class="err"></span></div>
          <div class="field"><label for="employmentType">Employment Type</label>
            <select id="employmentType" name="employmentType">
              <option value="">Select…</option>
              <option>Full-time</option><option>Part-time</option>
              <option>Contract</option><option>Freelance</option><option>Internship</option>
            </select><span class="err"></span></div>
          <div class="field"><label for="availability">Availability</label>
            <select id="availability" name="availability">
              <option value="">Select…</option>
              <option>Immediately</option><option>Within 2 weeks</option>
              <option>Within 1 month</option><option>Negotiable</option>
            </select><span class="err"></span></div>
          <div class="field full"><label for="experienceLevel">Experience Level</label>
            <select id="experienceLevel" name="experienceLevel">
              <option value="">Select…</option>
              <option>Fresher</option><option>1–2 years</option>
              <option>3–5 years</option><option>5–8 years</option><option>8+ years</option>
            </select><span class="err"></span></div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-head">
          <span class="form-section-num">3</span>
          <div><h3>Professional Information</h3><p>Your skills and links.</p></div>
        </div>
        <div class="form-grid">
          <div class="field full"><label for="skills">Skills <span class="req">*</span></label>
            <input id="skills" name="skills" type="text" placeholder="e.g. Premiere Pro, After Effects, Motion Graphics" required>
            <span class="hint">Separate skills with commas.</span><span class="err"></span></div>
          <div class="field"><label for="years">Years of Experience</label>
            <input id="years" name="years" type="number" min="0" max="50" placeholder="e.g. 3"><span class="err"></span></div>
          <div class="field"><label for="portfolioUrl">Portfolio URL</label>
            <input id="portfolioUrl" name="portfolioUrl" type="url" placeholder="https://…"><span class="err"></span></div>
          <div class="field"><label for="linkedinUrl">LinkedIn URL</label>
            <input id="linkedinUrl" name="linkedinUrl" type="url" placeholder="https://linkedin.com/in/…"><span class="err"></span></div>
          <div class="field"><label for="githubUrl">GitHub URL</label>
            <input id="githubUrl" name="githubUrl" type="url" placeholder="https://github.com/…"><span class="err"></span></div>
          <div class="field full"><label for="websiteUrl">Website URL</label>
            <input id="websiteUrl" name="websiteUrl" type="url" placeholder="https://…"><span class="err"></span></div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-head">
          <span class="form-section-num">4</span>
          <div><h3>Documents</h3><p>Resume / CV is required.</p></div>
        </div>
        <div class="form-grid">
          <div class="field full" id="resumeField">
            <label>Resume / CV <span class="req">*</span></label>
            <div class="file-drop">
              <input type="file" accept=".pdf,.doc,.docx">
              <div class="fd-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>
                </svg>
              </div>
              <strong>Click to upload or drag &amp; drop</strong>
              <span>PDF, DOC or DOCX · max ${humanSize(UPLOAD.maxBytes)}</span>
            </div>
            <div class="file-list"></div>
            <span class="err"></span>
          </div>

          <div class="field full">
            <label>Additional Document <span class="opt">Optional</span></label>
            <div class="file-drop">
              <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip">
              <div class="fd-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
                </svg>
              </div>
              <strong>Optional supporting file</strong>
              <span>Portfolio PDF, certificates or samples</span>
            </div>
            <div class="file-list"></div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-head">
          <span class="form-section-num">5</span>
          <div><h3>Additional Information</h3><p>Anything else we should know.</p></div>
        </div>
        <div class="form-grid">
          <div class="field full"><label for="coverMessage">Cover Message <span class="opt">Optional</span></label>
            <textarea id="coverMessage" name="coverMessage" placeholder="Tell us why you're a strong fit for this role…"></textarea>
            <span class="err"></span></div>
          <div class="field full"><label for="notes">Additional Notes <span class="opt">Optional</span></label>
            <textarea id="notes" name="notes" placeholder="Anything else we should know?"></textarea>
            <span class="err"></span></div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-head">
          <span class="form-section-num">6</span>
          <div><h3>Verification &amp; Terms</h3><p>Required before submission.</p></div>
        </div>

        <div id="verifyBox" class="verify-box" style="margin-bottom:20px">
          <div class="verify-head">
            <span class="vi">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </span>
            Human verification required
          </div>
          <p class="verify-note">
            We use Firebase App Check to confirm this submission comes from a genuine browser session.
            This is a real security check — it is not an advertisement.
          </p>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <button type="button" class="btn btn-secondary btn-sm" id="verifyBtn">Verify I'm Human</button>
            <span class="verify-state idle" id="verifyState">Verification not completed.</span>
          </div>
        </div>

        <label class="check" for="terms">
          <input type="checkbox" id="terms" name="terms">
          <span>I confirm that the information provided by me is accurate and I agree to the company's
            <a href="terms.html" target="_blank" rel="noopener">Terms &amp; Conditions</a> and
            <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>. <span class="req">*</span></span>
        </label>
        <span class="err" id="termsErr" style="color:#FCA5A5;font-size:.78rem;display:none">Please accept the Terms &amp; Conditions.</span>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-lg" id="submitBtn" disabled>Submit Application</button>
        <span style="font-size:.82rem;color:var(--muted-2)">
          Fields marked <span class="req">*</span> are required.
        </span>
      </div>
    </form>

    <div id="successScreen" style="display:none"></div>`;

  const form = $("#applicationForm");
  const submitBtn = $("#submitBtn");
  const terms = $("#terms");
  const verifyBtn = $("#verifyBtn");
  const verifyState = $("#verifyState");

  const verifier = createVerifier(verifyBtn, verifyState);

  const getResume = initFileDrop($("#resumeField"), {
    accept: UPLOAD.resumeTypes, maxBytes: UPLOAD.maxBytes
  });
  const extraField = form.querySelectorAll(".field.full")[1];
  const getExtra = initFileDrop(extraField, {
    accept: UPLOAD.assetTypes, maxBytes: UPLOAD.maxBytes
  });

  bindLiveValidation(form);

  /* gate submit */
  const refreshGate = () => {
    const resumeOk = getResume().length > 0;
    const termsOk = terms.checked;
    const verifyOk = verifier.isVerified();
    const requiredOk = ["fullName", "email", "phone", "jobTitle", "skills"]
      .every(n => form.elements[n]?.value.trim());
    submitBtn.disabled = !(resumeOk && termsOk && verifyOk && requiredOk);
  };
  form.addEventListener("input", refreshGate);
  form.addEventListener("change", refreshGate);
  terms.addEventListener("change", () => {
    $("#termsErr").style.display = terms.checked ? "none" : "block";
    refreshGate();
  });
  /* file drops change state */
  const t = setInterval(refreshGate, 500);

  /* submit */
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const rules = {
      fullName: [validators.required, validators.min(2)],
      email:    [validators.required, validators.email],
      phone:    [validators.required, validators.phone],
      jobTitle: [validators.required],
      skills:   [validators.required],
      portfolioUrl: [validators.url],
      linkedinUrl:  [validators.url],
      githubUrl:    [validators.url],
      websiteUrl:   [validators.url]
    };
    if (!validateForm(form, rules)) { toast("Please fix the highlighted fields.", "error"); return; }
    if (!getResume().length) { setFieldError($("#resumeField input[type=file]"), "Please upload a PDF/DOC/DOCX resume."); toast("Resume is required.", "error"); return; }
    if (!terms.checked) { $("#termsErr").style.display = "block"; toast("Please accept the Terms & Conditions.", "error"); return; }
    if (!verifier.isVerified()) { toast("Please complete human verification.", "warn"); return; }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Submitting…`;

    try {
      const refId = makeRefId("APP");
      const appId = `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      /* Upload resume */
      const resumeFile = getResume()[0];
      const resumePath = `resumes/${appId}/${Date.now()}_${resumeFile.name.replace(/[^\w.\-]/g, "_")}`;
      const resumeUrl = await uploadWithProgress(resumeFile, resumePath);

      /* Upload extra */
      let extraUrl = "";
      const extras = getExtra();
      if (extras.length) {
        const ex = extras[0];
        extraUrl = await uploadWithProgress(ex, `applications/${appId}/extra_${Date.now()}_${ex.name.replace(/[^\w.\-]/g, "_")}`);
      }

      const payload = {
        refId,
        name:           clean(form.fullName.value, 120),
        email:          clean(form.email.value, 160).toLowerCase(),
        phone:          clean(form.phone.value, 40),
        location:       clean(form.location.value, 120),
        jobId:          job.id || "general",
        jobTitle:       clean(form.jobTitle.value, 160),
        employmentType: clean(form.employmentType.value, 40),
        availability:   clean(form.availability.value, 40),
        experienceLevel:clean(form.experienceLevel.value, 40),
        skills:         clean(form.skills.value, 600),
        years:          clean(form.years.value, 4),
        portfolioUrl:   clean(form.portfolioUrl.value, 400),
        linkedinUrl:    clean(form.linkedinUrl.value, 400),
        githubUrl:      clean(form.githubUrl.value, 400),
        websiteUrl:     clean(form.websiteUrl.value, 400),
        resumeUrl,
        extraDocUrl:    extraUrl,
        coverMessage:   clean(form.coverMessage.value, 3000),
        notes:          clean(form.notes.value, 3000),
        status:         "New",
        adminNotes:     "",
        source:         "website",
        createdAt:      serverTimestamp()
      };

      const docRef = await addDoc(collection(db, COL.jobApplications), payload);

      clearInterval(t);
      form.style.display = "none";
      $("#successScreen").style.display = "block";
      $("#successScreen").innerHTML = `
        <div class="success-screen">
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <h2>Application Submitted Successfully</h2>
          <p>Your application reference is</p>
          <div class="ref-id">#${esc(refId)}</div>
          <p style="margin-top:6px">
            Our team will review your application and get back to you by email.
            Please keep this reference number for any follow-up.
          </p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:12px">
            <a class="btn btn-primary" href="careers.html">Browse More Openings</a>
            <a class="btn btn-ghost" href="index.html">Back to Home</a>
          </div>
        </div>`;
      window.scrollTo({ top: $("#successScreen").offsetTop - 120, behavior: "smooth" });
      toast("Application submitted successfully.", "success");
      console.info("[Application] saved:", docRef.id);
    } catch (err) {
      console.error("[Application] submit:", err);
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Application";
      toast(err?.message || "Submission failed. Please try again.", "error", "Error");
    }
  });
}

function uploadWithProgress(file, path) {
  return new Promise(async (resolve, reject) => {
    try {
      const { ref, uploadBytesResumable, getDownloadURL } = await import("./firebase.js");
      const { storage } = await import("./firebase.js");
      const task = uploadBytesResumable(ref(storage, path), file, {
        contentType: file.type,
        cacheControl: "private, max-age=0"
      });
      task.on("state_changed", null, reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref)));
    } catch (e) { reject(e); }
  });
}

initJobPage();