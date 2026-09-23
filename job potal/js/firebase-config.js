/* =========================================================
   FIREBASE CONFIG — REPLACE ALL PLACEHOLDERS
   These keys are public by design (Firebase Web API keys are
   not secrets). Security is enforced by Firestore/Storage rules
   + App Check, NOT by hiding this file.
   ========================================================= */

export const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
  measurementId:     "YOUR_MEASUREMENT_ID"
};

/* ---- App Check (reCAPTCHA v3) ---- */
export const appCheckConfig = {
  enabled: true,
  siteKey: "YOUR_RECAPTCHA_V3_SITE_KEY"
};

/* ---- Company / brand placeholders ---- */
export const SITE = {
  name:        "Nexoral",
  legalName:   "Nexoral Digital Pvt. Ltd.",
  tagline:     "Creative. Content. Technology. One Team.",
  email:       "hello@nexoral.example",
  phone:       "+91 00000 00000",
  whatsapp:    "+910000000000",
  address:     "Remote-first · Operating globally",
  hours:       "Mon – Sat · 10:00 – 19:00 IST",
  telegramUrl: "https://t.me/your_channel",
  social: {
    instagram: "https://instagram.com/yourhandle",
    linkedin:  "https://linkedin.com/company/yourcompany",
    youtube:   "https://youtube.com/@yourchannel",
    github:    "https://github.com/yourorg",
    telegram:  "https://t.me/your_channel"
  },
  sponsoredLink: "https://your-sponsored-link.example"
};

/* ---- Upload limits ---- */
export const UPLOAD = {
  maxBytes: 8 * 1024 * 1024,
  resumeTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ],
  assetTypes: [
    "application/pdf","image/png","image/jpeg","image/webp",
    "application/zip","application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]
};

/* ---- Firestore collections ---- */
export const COL = {
  jobs:           "jobs",
  jobApplications:"jobApplications",
  serviceRequests:"serviceRequests",
  portfolio:      "portfolio",
  contactMessages:"contactMessages",
  counters:       "counters"
};