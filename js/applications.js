/* =========================================================
   Standalone application entry helper (used by careers.html CTA)
   The full form lives in job-details.html via js/jobs.js
   ========================================================= */
import { db, collection, addDoc, serverTimestamp, makeRefId } from "./firebase.js";
import { COL, UPLOAD } from "./firebase-config.js";
import { esc, toast, validateForm, bindLiveValidation, validators,
         setFieldError, initFileDrop, createVerifier, humanSize, clean }
  from "./main.js";

const $ = s => document.querySelector(s);

/**
 * Quick application widget — used where a full job page isn't required.
 * Renders into #quickApplyRoot if present.
 */
export function mountQuickApply(containerSelector = "#quickApplyRoot") {
  const root = document.querySelector(containerSelector);
  if (!root) return;

  root.innerHTML = `
    <form class="form-shell" id="quickApplyForm" novalidate>
      <div class="form-section-head">
        <span class="form-section-num">1</span>
        <div><h3>Quick Application</h3><p>We'll follow up by email for any additional details.</p></div>
      </div>

      <div class="form-grid">
        <div class="field"><label for="qaName">Full Name <span class="req">*</span></label>
          <input id="qaName" name="name" type="text" placeholder="Your full name" required><span class="err"></span></div>
        <div class="field"><label for="qaEmail">Email <span class="req">*</span></label>
          <input id="qaEmail" name="email" type="email" placeholder="you@example.com" required><span class="err"></span></div>
        <div class="field"><label for="qaPhone">Phone / WhatsApp <span class="req">*</span></label>
          <input id="qaPhone" name="phone" type="tel" placeholder="+91 00000 00000" required><span class="err"></span></div>
        <div class="field"><label for="qaRole">Role Applying For <span class="req">*</span></label>
          <input id="qaRole" name="jobTitle" type="text" placeholder="e.g. Video Editor" required><span class="err"></span></div>
        <div class="field full"><label for="qaSkills">Skills <span class="req">*</span></label>
          <input id="qaSkills" name="skills" type="text" placeholder="Comma separated" required><span class="err"></span></div>
        <div class="field full"><label for="qaPortfolio">Portfolio URL</label>
          <input id="qaPortfolio" name="portfolioUrl" type="url" placeholder="https://…"><span class="err"></span></div>
      </div>

      <div class="field" id="qaResumeField" style="margin-top:20px">
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
        <div class="file-list"></div><span class="err"></span>
      </div>

      <div class="verify-box" style="margin-top:20px">
        <div class="verify-head">
          <span class="vi">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          Human verification required
        </div>
        <p class="verify-note">A real App Check security check — not an advertisement.</p>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <button type="button" class="btn btn-secondary btn-sm" id="qaVerifyBtn">Verify I'm Human</button>
          <span class="verify-state idle" id="qaVerifyState">Verification not completed.</span>
        </div>
      </div>

      <label class="check" for="qaTerms" style="margin-top:18px">
        <input type="checkbox" id="qaTerms" name="terms">
        <span>I confirm the information provided is accurate and I agree to the
          <a href="terms.html" target="_blank" rel="noopener">Terms &amp; Conditions</a> and
          <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.<span class="req">*</span></span>
      </label>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-lg" id="qaSubmit" disabled>Submit Application</button>
      </div>
    </form>
    <div id="qaSuccess" style="display:none"></div>`;

  const form = $("#quickApplyForm");
  const submitBtn = $("#qaSubmit");
  const terms = $("#qaTerms");
  const verifier = createVerifier($("#qaVerifyBtn"), $("#qaVerifyState"));
  const getResume = initFileDrop($("#qaResumeField"), {
    accept: UPLOAD.resumeTypes, maxBytes: UPLOAD.maxBytes
  });
  bindLiveValidation(form);

  const gate = setInterval(() => {
    submitBtn.disabled = !(
      getResume().length &&
      terms.checked &&
      verifier.isVerified() &&
      form.name.value.trim() &&
      form.email.value.trim() &&
      form.phone.value.trim() &&
      form.jobTitle.value.trim() &&
      form.skills.value.trim()
    );
  }, 500);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const ok = validateForm(form, {
      name: [validators.required, validators.min(2)],
      email: [validators.required, validators.email],
      phone: [validators.required, validators.phone],
      jobTitle: [validators.required],
      skills: [validators.required],
      portfolioUrl: [validators.url]
    });
    if (!ok) { toast("Please fix the highlighted fields.", "error"); return; }
    if (!getResume().length) { toast("Resume is required.", "error"); return; }
    if (!terms.checked) { toast("Please accept the Terms & Conditions.", "error"); return; }
    if (!verifier.isVerified()) { toast("Please complete human verification.", "warn"); return; }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Submitting…`;

    try {
      const refId = makeRefId("APP");
      const appId = `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const file = getResume()[0];

      const { storage, ref, uploadBytesResumable, getDownloadURL } = await import("./firebase.js");
      const path = `resumes/${appId}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
      const task = uploadBytesResumable(ref(storage, path), file,
        { contentType: file.type, cacheControl: "private, max-age=0" });
      const url = await new Promise((res, rej) => {
        task.on("state_changed", null, rej, async () => res(await getDownloadURL(task.snapshot.ref)));
      });

      await addDoc(collection(db, COL.jobApplications), {
        refId,
        name: clean(form.name.value, 120),
        email: clean(form.email.value, 160).toLowerCase(),
        phone: clean(form.phone.value, 40),
        jobId: "general",
        jobTitle: clean(form.jobTitle.value, 160),
        skills: clean(form.skills.value, 600),
        portfolioUrl: clean(form.portfolioUrl.value, 400),
        resumeUrl: url,
        status: "New",
        adminNotes: "",
        source: "quick-apply",
        createdAt: serverTimestamp()
      });

      clearInterval(gate);
      form.style.display = "none";
      const s = $("#qaSuccess");
      s.style.display = "block";
      s.innerHTML = `
        <div class="success-screen">
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <h2>Application Submitted Successfully</h2>
          <p>Your application reference is</p>
          <div class="ref-id">#${esc(refId)}</div>
          <p>Our team will review your application and contact you by email.</p>
        </div>`;
      toast("Application submitted successfully.", "success");
    } catch (err) {
      console.error(err);
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Application";
      toast(err?.message || "Submission failed. Please try again.", "error");
    }
  });
}

if (document.querySelector("#quickApplyRoot")) mountQuickApply();