/* =========================================================
   Hire Us — service request form → serviceRequests
   ========================================================= */
import { db, collection, addDoc, serverTimestamp, makeRefId,
         storage, ref, uploadBytesResumable, getDownloadURL } from "./firebase.js";
import { COL, UPLOAD, SITE } from "./firebase-config.js";
import { esc, toast, validateForm, bindLiveValidation, validators,
         setFieldError, initFileDrop, createVerifier, humanSize, clean }
  from "./main.js";
import { serviceOptionsHTML } from "./services.js";

const $ = s => document.querySelector(s);

function mountHireForm() {
  const wrap = $("#hireFormWrap");
  if (!wrap) return;

  const preselect = new URLSearchParams(location.search).get("s") || "";

  wrap.innerHTML = `
    <form class="form-shell" id="hireForm" novalidate>

      <div class="form-section">
        <div class="form-section-head">
          <span class="form-section-num">1</span>
          <div><h3>Contact</h3><p>Who should we get back to?</p></div>
        </div>
        <div class="form-grid">
          <div class="field"><label for="hName">Full Name <span class="req">*</span></label>
            <input id="hName" name="name" type="text" autocomplete="name" placeholder="Your full name" required><span class="err"></span></div>
          <div class="field"><label for="hEmail">Email <span class="req">*</span></label>
            <input id="hEmail" name="email" type="email" autocomplete="email" placeholder="you@example.com" required><span class="err"></span></div>
          <div class="field"><label for="hPhone">Phone / WhatsApp <span class="req">*</span></label>
            <input id="hPhone" name="phone" type="tel" autocomplete="tel" placeholder="+91 00000 00000" required><span class="err"></span></div>
          <div class="field"><label for="hCompany">Company / Brand <span class="opt">Optional</span></label>
            <input id="hCompany" name="company" type="text" placeholder="Company or brand name"><span class="err"></span></div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-head">
          <span class="form-section-num">2</span>
          <div><h3>Project</h3><p>Tell us what you need built or produced.</p></div>
        </div>
        <div class="form-grid">
          <div class="field"><label for="hService">Service Required <span class="req">*</span></label>
            <select id="hService" name="service" required>${serviceOptionsHTML(preselect)}</select><span class="err"></span></div>
          <div class="field"><label for="hService2">Secondary Service <span class="opt">Optional</span></label>
            <select id="hService2" name="secondaryService">${serviceOptionsHTML("")}</select><span class="err"></span></div>
          <div class="field full"><label for="hTitle">Project Title <span class="opt">Optional</span></label>
            <input id="hTitle" name="projectTitle" type="text" placeholder="e.g. Q3 Product Launch Video Series"><span class="err"></span></div>
          <div class="field full"><label for="hDesc">Project Description <span class="req">*</span></label>
            <textarea id="hDesc" name="description" placeholder="Goals, scope, deliverables, references, deadlines…" required></textarea>
            <span class="hint">The more detail you share, the more accurate our proposal will be.</span><span class="err"></span></div>
          <div class="field"><label for="hBudget">Budget Range <span class="opt">Optional</span></label>
            <select id="hBudget" name="budget">
              <option value="">Select a range…</option>
              <option>Under ₹10,000</option>
              <option>₹10,000 – ₹25,000</option>
              <option>₹25,000 – ₹50,000</option>
              <option>₹50,000 – ₹1,00,000</option>
              <option>₹1,00,000 – ₹5,00,000</option>
              <option>₹5,00,000 – ₹10,00,000</option>
              <option>₹10,00,000+</option>
              <option>Not decided yet</option>
            </select><span class="err"></span></div>
          <div class="field"><label for="hTimeline">Expected Timeline <span class="opt">Optional</span></label>
            <select id="hTimeline" name="timeline">
              <option value="">Select…</option>
              <option>Urgent (within 1 week)</option>
              <option>2–4 weeks</option>
              <option>1–2 months</option>
              <option>2–3 months</option>
              <option>Ongoing / retainer</option>
              <option>Flexible</option>
            </select><span class="err"></span></div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-head">
          <span class="form-section-num">3</span>
          <div><h3>Online Presence</h3><p>Helps us understand your brand and audience.</p></div>
        </div>
        <div class="form-grid">
          <div class="field"><label for="hWebsite">Website</label>
            <input id="hWebsite" name="website" type="url" placeholder="https://…"><span class="err"></span></div>
          <div class="field"><label for="hInstagram">Instagram</label>
            <input id="hInstagram" name="instagram" type="url" placeholder="https://instagram.com/…"><span class="err"></span></div>
          <div class="field"><label for="hYoutube">YouTube</label>
            <input id="hYoutube" name="youtube" type="url" placeholder="https://youtube.com/@…"><span class="err"></span></div>
          <div class="field"><label for="hLinkedin">LinkedIn</label>
            <input id="hLinkedin" name="linkedin" type="url" placeholder="https://linkedin.com/company/…"><span class="err"></span></div>
          <div class="field full"><label for="hOther">Other Social / Profile Link</label>
            <input id="hOther" name="otherLink" type="url" placeholder="https://…"><span class="err"></span></div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-head">
          <span class="form-section-num">4</span>
          <div><h3>References &amp; Requirements</h3><p>Links or notes that shape the direction.</p></div>
        </div>
        <div class="form-grid">
          <div class="field full"><label for="hRefs">Reference Links <span class="opt">Optional</span></label>
            <textarea id="hRefs" name="referenceLinks" placeholder="Paste reference URLs, one per line" style="min-height:90px"></textarea><span class="err"></span></div>
          <div class="field full"><label for="hExtra">Additional Requirements <span class="opt">Optional</span></label>
            <textarea id="hExtra" name="additionalRequirements" placeholder="Anything else we should account for?"></textarea><span class="err"></span></div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-head">
          <span class="form-section-num">5</span>
          <div><h3>Project Files</h3><p>Optional — briefs, brand assets or references.</p></div>
        </div>
        <div class="field full" id="hireFilesField">
          <label>Upload Files <span class="opt">Optional</span></label>
          <div class="file-drop">
            <input type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.zip">
            <div class="fd-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>
              </svg>
            </div>
            <strong>Click to upload or drag &amp; drop</strong>
            <span>PDF, DOC, DOCX, PNG, JPG, WEBP, ZIP · max ${humanSize(UPLOAD.maxBytes)} each · up to 5 files</span>
          </div>
          <div class="file-list"></div><span class="err"></span>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-head">
          <span class="form-section-num">6</span>
          <div><h3>Verification &amp; Terms</h3><p>Required before submission.</p></div>
        </div>

        <div class="verify-box" style="margin-bottom:20px">
          <div class="verify-head">
            <span class="vi">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            Human verification required
          </div>
          <p class="verify-note">
            We use Firebase App Check to confirm this request comes from a genuine browser session.
            This is a real security check — it is not an advertisement.
          </p>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <button type="button" class="btn btn-secondary btn-sm" id="hireVerifyBtn">Verify I'm Human</button>
            <span class="verify-state idle" id="hireVerifyState">Verification not completed.</span>
          </div>
          <div class="sponsored">
            <span>Not related to verification:</span>
            <a href="${esc(SITE.sponsoredLink)}" target="_blank" rel="noopener noreferrer sponsored">Continue via Sponsored Link</a>
            <span>· opens an external advertisement in a new tab.</span>
          </div>
        </div>

        <label class="check" for="hireTerms">
          <input type="checkbox" id="hireTerms" name="terms">
          <span>I confirm that the information provided is accurate and I agree to the company's
            <a href="terms.html" target="_blank" rel="noopener">Terms &amp; Conditions</a> and
            <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>. <span class="req">*</span></span>
        </label>
        <span class="err" id="hireTermsErr" style="color:#FCA5A5;font-size:.78rem;display:none">Please accept the Terms &amp; Conditions.</span>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-lg" id="hireSubmit" disabled>Submit Request</button>
        <span style="font-size:.82rem;color:var(--muted-2)">Fields marked <span class="req">*</span> are required.</span>
      </div>
    </form>

    <div id="hireSuccess" style="display:none"></div>`;

  const form = $("#hireForm");
  const submitBtn = $("#hireSubmit");
  const terms = $("#hireTerms");
  const verifier = createVerifier($("#hireVerifyBtn"), $("#hireVerifyState"));
  const getFiles = initFileDrop($("#hireFilesField"), {
    accept: UPLOAD.assetTypes, maxBytes: UPLOAD.maxBytes, multiple: true
  });

  bindLiveValidation(form);

  const gate = setInterval(() => {
    submitBtn.disabled = !(
      terms.checked &&
      verifier.isVerified() &&
      form.name.value.trim() &&
      form.email.value.trim() &&
      form.phone.value.trim() &&
      form.service.value &&
      form.description.value.trim()
    );
  }, 500);

  terms.addEventListener("change", () => {
    $("#hireTermsErr").style.display = terms.checked ? "none" : "block";
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const ok = validateForm(form, {
      name: [validators.required, validators.min(2)],
      email: [validators.required, validators.email],
      phone: [validators.required, validators.phone],
      service: [validators.required],
      description: [validators.required, validators.min(20)],
      website: [validators.url],
      instagram: [validators.url],
      youtube: [validators.url],
      linkedin: [validators.url],
      otherLink: [validators.url]
    });
    if (!ok) { toast("Please fix the highlighted fields.", "error"); return; }
    if (!terms.checked) { $("#hireTermsErr").style.display = "block"; toast("Please accept the Terms & Conditions.", "error"); return; }
    if (!verifier.isVerified()) { toast("Please complete human verification.", "warn"); return; }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Submitting…`;

    try {
      const refId = makeRefId("REQ");
      const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      /* Upload files */
      const fileUrls = [];
      for (const f of getFiles()) {
        const path = `serviceRequests/${reqId}/${Date.now()}_${f.name.replace(/[^\w.\-]/g, "_")}`;
        const task = uploadBytesResumable(ref(storage, path), f,
          { contentType: f.type, cacheControl: "private, max-age=0" });
        const url = await new Promise((res, rej) => {
          task.on("state_changed", null, rej, async () => res(await getDownloadURL(task.snapshot.ref)));
        });
        fileUrls.push({ name: f.name, size: f.size, url });
      }

      const links = [
        form.website.value   && { label: "Website",   url: clean(form.website.value, 400) },
        form.instagram.value && { label: "Instagram", url: clean(form.instagram.value, 400) },
        form.youtube.value   && { label: "YouTube",   url: clean(form.youtube.value, 400) },
        form.linkedin.value  && { label: "LinkedIn",  url: clean(form.linkedin.value, 400) },
        form.otherLink.value && { label: "Other",     url: clean(form.otherLink.value, 400) }
      ].filter(Boolean);

      await addDoc(collection(db, COL.serviceRequests), {
        refId,
        name:            clean(form.name.value, 120),
        email:           clean(form.email.value, 160).toLowerCase(),
        phone:           clean(form.phone.value, 40),
        company:         clean(form.company.value, 160),
        service:         clean(form.service.value, 80),
        secondaryService:clean(form.secondaryService.value, 80),
        projectTitle:    clean(form.projectTitle.value, 200),
        description:     clean(form.description.value, 5000),
        budget:          clean(form.budget.value, 60),
        timeline:        clean(form.timeline.value, 60),
        links,
        referenceLinks:  clean(form.referenceLinks.value, 2000),
        additionalRequirements: clean(form.additionalRequirements.value, 3000),
        fileUrls,
        status:          "New",
        adminNotes:      "",
        source:          "hire-us",
        createdAt:       serverTimestamp()
      });

      clearInterval(gate);
      form.style.display = "none";
      const s = $("#hireSuccess");
      s.style.display = "block";
      s.innerHTML = `
        <div class="success-screen">
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <h2>Request Submitted Successfully</h2>
          <p>Your request reference is</p>
          <div class="ref-id">#${esc(refId)}</div>
          <p>Our team will review your requirements and respond within one business day.</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:12px">
            <a class="btn btn-primary" href="portfolio.html">See Our Work</a>
            <a class="btn btn-ghost" href="index.html">Back to Home</a>
          </div>
        </div>`;
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast("Request submitted successfully.", "success");
    } catch (err) {
      console.error("[Hire] submit:", err);
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Request";
      toast(err?.message || "Submission failed. Please try again.", "error");
    }
  });
}

if (document.querySelector("#hireFormWrap")) mountHireForm();