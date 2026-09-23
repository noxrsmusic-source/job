/* =========================================================
   Service catalogue — single source of truth
   ========================================================= */
import { esc, observeReveal } from "./main.js";

const ico = {
  video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="14" height="14" rx="2.5"/><path d="m22 8-6 4 6 4z"/></svg>`,
  write: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
  social:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>`,
  design:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="13" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="10" cy="19" r="2.5"/><path d="M12 12h.01"/></svg>`,
  web:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-5 4 5 4M16 8l5 4-5 4M13.5 4 10.5 20"/></svg>`,
  soft:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h8"/></svg>`,
  ai:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9h.01M15 9h.01M9.5 15c1.5 1 3.5 1 5 0"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>`,
  other: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`
};

export const SERVICES = [
  {
    slug: "video-production",
    icon: ico.video,
    title: "Video Production & Editing",
    short: "Short-form, long-form, podcast, promo and motion graphics — edited for retention and brand consistency.",
    tags: ["Reels", "YouTube", "Podcast", "Motion Graphics"],
    overview: "End-to-end video post-production for creators, brands and businesses. We handle everything from raw footage to platform-ready exports, including pacing, sound design, colour, captions and motion graphics.",
    provides: [
      "Short-form video editing for Reels, Shorts and TikTok",
      "Long-form YouTube editing with retention-focused pacing",
      "Podcast editing, audio cleanup and clip extraction",
      "Promotional and advertisement editing",
      "Motion graphics, animated titles and lower thirds",
      "Subtitles, captions and multi-language subtitle files",
      "Thumbnail concepts and hook-first structuring"
    ],
    workflow: [
      "Share raw footage, brand assets and reference videos",
      "We align on style, pacing, aspect ratios and hooks",
      "First cut delivered for review within the agreed window",
      "Two revision rounds, then final exports in all required formats"
    ],
    deliverables: [
      "Master file in 16:9, 9:16 and 1:1 as needed",
      "Caption files (.srt / .vtt)",
      "Project source files on request",
      "Organised asset folder with naming convention"
    ],
    industries: ["Creator economy", "D2C brands", "Education", "SaaS", "Real estate", "Personal brands"],
    why: [
      "Editors who understand platform algorithms, not just cuts",
      "Consistent brand templates across every episode or post",
      "Fast turnaround with predictable revision rounds",
      "One team for editing, design and thumbnail production"
    ],
    faq: [
      { q: "What turnaround time should I expect?", a: "Short-form edits typically take 2–3 working days, long-form 4–7 working days depending on length and complexity. Rush delivery is available on request." },
      { q: "How do I share footage?", a: "We accept Google Drive, Dropbox, WeTransfer or direct Firebase Storage uploads. We'll send a structured folder template so handoff stays clean." },
      { q: "Do you provide the raw project files?", a: "Yes. Final exports are always included. Source project files can be handed over on request, subject to the tools used." }
    ]
  },
  {
    slug: "writing-content",
    icon: ico.write,
    title: "Writing & Content",
    short: "Copywriting, scripts, blogs and content strategy that sound like your brand and convert your audience.",
    tags: ["Copywriting", "Scripts", "Blogs", "Strategy"],
    overview: "Words that do a job. We write across the funnel — from ad hooks and video scripts to long-form articles and website copy — grounded in your positioning and audience research.",
    provides: [
      "Website copy, landing pages and product pages",
      "Video scripts for YouTube, Reels and ads",
      "Blog articles and SEO-informed long-form content",
      "Social media captions and content series",
      "Product descriptions and catalogue copy",
      "Email and newsletter copy",
      "Content strategy, calendars and tone-of-voice guides"
    ],
    workflow: [
      "Brand and audience discovery call plus a short questionnaire",
      "Keyword and competitor research where relevant",
      "Draft delivery with rationale notes",
      "Revision round, then final copy deck and style guide"
    ],
    deliverables: [
      "Final copy in Google Docs and Markdown",
      "Tone-of-voice reference sheet",
      "Content calendar for ongoing engagements",
      "SEO metadata suggestions (title, description, headings)"
    ],
    industries: ["SaaS", "E-commerce", "Education", "Healthcare", "Finance", "Professional services"],
    why: [
      "Writers who understand search intent and conversion",
      "Research-backed drafts — no generic filler",
      "Consistent voice across every channel",
      "Ready-to-publish formatting, not rough notes"
    ],
    faq: [
      { q: "Do you research our industry?", a: "Yes. Every engagement starts with a discovery questionnaire plus independent research into your category, competitors and audience." },
      { q: "Is SEO included?", a: "On-page SEO structure and keyword mapping are included for blog and website copy. Technical SEO is covered under Web Development." },
      { q: "Can you match an existing tone of voice?", a: "Absolutely. We build a tone-of-voice reference sheet from your existing content and keep it as the standard for all future deliverables." }
    ]
  },
  {
    slug: "social-media",
    icon: ico.social,
    title: "Social Media",
    short: "Strategy, calendars, publishing and engagement — full account management for brands and creators.",
    tags: ["Management", "Calendars", "Engagement", "Strategy"],
    overview: "We run social accounts like a product: clear positioning, a repeatable content system, disciplined publishing and active community management.",
    provides: [
      "Full social media management across platforms",
      "Content calendar planning and approval workflows",
      "Caption writing, hashtag research and posting",
      "Community management and audience engagement",
      "Monthly performance reporting",
      "Social media strategy and platform selection",
      "Content repurposing across formats"
    ],
    workflow: [
      "Audit of current accounts and competitor benchmarking",
      "Strategy document with pillars, formats and cadence",
      "Monthly calendar approved in advance",
      "Publishing, engagement and end-of-month reporting"
    ],
    deliverables: [
      "Monthly content calendar",
      "Scheduled and published posts",
      "Weekly engagement summary",
      "Monthly performance report with recommendations"
    ],
    industries: ["D2C", "Hospitality", "Fitness", "Education", "Creators", "Local businesses"],
    why: [
      "Systems over sporadic posting",
      "Approval workflow so nothing goes out off-brand",
      "Reporting that ties activity to outcomes",
      "Creative, copy and scheduling handled by one team"
    ],
    faq: [
      { q: "Which platforms do you manage?", a: "Instagram, YouTube, LinkedIn, X, Facebook and Telegram. We'll recommend the platforms that actually match your audience rather than spreading thin." },
      { q: "How many posts per month?", a: "Cadence is scoped per engagement — typically 12–30 posts per month depending on the platform mix and production requirements." },
      { q: "Do you reply to comments and DMs?", a: "Yes, community management is included. We work from an approved response guide so replies stay on-brand." }
    ]
  },
  {
    slug: "graphic-design",
    icon: ico.design,
    title: "Graphic Design",
    short: "Brand identity, social creatives, thumbnails, presentations and UI design with a consistent design system.",
    tags: ["Branding", "Thumbnails", "Creatives", "UI Design"],
    overview: "Design that holds up across every surface. We build a reusable design system so your brand looks identical on a thumbnail, a poster and a product screen.",
    provides: [
      "Brand identity, logo systems and guidelines",
      "Social media graphics and content templates",
      "YouTube thumbnails optimised for click-through",
      "Posters, banners and print-ready artwork",
      "Marketing creatives for ads and campaigns",
      "Presentation and pitch deck design",
      "UI design for web and mobile products"
    ],
    workflow: [
      "Brand discovery, moodboard and direction selection",
      "Concept routes presented with rationale",
      "Refinement on the chosen route",
      "Final delivery with source files and usage guide"
    ],
    deliverables: [
      "Editable source files (Figma / Illustrator / Photoshop)",
      "Export pack: PNG, JPG, SVG, PDF",
      "Brand guidelines PDF",
      "Reusable templates for social and thumbnails"
    ],
    industries: ["Startups", "Agencies", "Creators", "E-commerce", "Events", "Corporate"],
    why: [
      "Systems thinking, not one-off graphics",
      "Platform-correct exports every time",
      "Fast, predictable design turnaround",
      "Design and development in the same team for clean handoff"
    ],
    faq: [
      { q: "Do I get the source files?", a: "Yes. Fully editable source files are included in every design engagement, along with the export pack." },
      { q: "Can you work with our existing brand?", a: "Yes. We can extend an existing identity, document it properly, or rebuild it from the ground up if it's limiting your growth." },
      { q: "How many revisions are included?", a: "Two structured revision rounds are standard. Additional rounds are quoted transparently if needed." }
    ]
  },
  {
    slug: "web-development",
    icon: ico.web,
    title: "Web Development",
    short: "Business websites, landing pages, e-commerce and web apps — fast, accessible and SEO-ready.",
    tags: ["Websites", "Landing Pages", "E-commerce", "Maintenance"],
    overview: "We build websites and web applications that load fast, rank well, work on every device, and can be maintained by a normal team without heroics.",
    provides: [
      "Business and corporate websites",
      "High-conversion landing pages",
      "Portfolio and personal brand websites",
      "E-commerce storefronts and product catalogues",
      "Web applications and customer portals",
      "Admin dashboards and internal tools",
      "Ongoing website maintenance and support"
    ],
    workflow: [
      "Requirements, sitemap and technical scope",
      "Wireframes and UI design approval",
      "Development, staging review and QA",
      "Launch, handover and optional maintenance plan"
    ],
    deliverables: [
      "Fully responsive production website",
      "CMS or Firebase-backed content management",
      "SEO foundation: metadata, sitemap, structured data",
      "Deployment documentation and training walkthrough"
    ],
    industries: ["SaaS", "Retail", "Healthcare", "Education", "Professional services", "Non-profit"],
    why: [
      "Performance and accessibility built in from day one",
      "Clean, documented code your next developer can read",
      "Firebase or headless CMS so content stays editable",
      "Design and engineering handled by one accountable team"
    ],
    faq: [
      { q: "What stack do you use?", a: "For most projects: HTML5, CSS3, ES6+ JavaScript and Firebase (Authentication, Firestore, Storage, Hosting, App Check). No Node.js server required." },
      { q: "Will I be able to edit content myself?", a: "Yes. We build a Firebase-backed admin panel so you can manage content, jobs, portfolio items and enquiries without touching code." },
      { q: "Do you handle hosting?", a: "Yes. We deploy to Firebase Hosting with SSL, global CDN and automatic builds included in scope." }
    ]
  },
  {
    slug: "software-development",
    icon: ico.soft,
    title: "Software Development",
    short: "Custom software, SaaS products, internal tools and automation systems built to scale.",
    tags: ["Custom Software", "SaaS", "Automation", "Dashboards"],
    overview: "When off-the-shelf tools stop fitting, we build the software you actually need — scoped tightly, shipped incrementally and documented properly.",
    provides: [
      "Custom software for specific business workflows",
      "SaaS product development and multi-tenant architecture",
      "Internal business tools and operations dashboards",
      "Workflow and process automation systems",
      "Management and analytics dashboards",
      "API integrations with third-party services",
      "Authentication, role management and audit trails"
    ],
    workflow: [
      "Discovery workshops and requirements documentation",
      "Architecture proposal, milestones and estimate",
      "Incremental sprints with demo builds",
      "Delivery, documentation and post-launch support window"
    ],
    deliverables: [
      "Production application with source code",
      "Technical architecture document",
      "Admin and user documentation",
      "Handover session with your team"
    ],
    industries: ["Logistics", "Fintech", "Healthcare", "Education", "Manufacturing", "Agencies"],
    why: [
      "Scoped in milestones so you see value early",
      "Security and role-based access designed in, not bolted on",
      "Firebase-native architecture — no unnecessary server overhead",
      "Documented code and clean handover, always"
    ],
    faq: [
      { q: "How do you price custom software?", a: "Fixed-scope milestones for well-defined projects, or a monthly retainer for evolving products. Both are documented transparently before work begins." },
      { q: "Can you take over an existing codebase?", a: "Yes. We start with a code audit, document what exists, then propose a stabilisation and improvement plan." },
      { q: "Who owns the code?", a: "You do. Full source code ownership transfers to you on final payment, along with all documentation." }
    ]
  },
  {
    slug: "ai-solutions",
    icon: ico.ai,
    title: "AI & Digital Solutions",
    short: "AI-assisted content workflows, automation, prompt engineering and AI-powered tools integrated into your stack.",
    tags: ["AI Workflows", "Automation", "Prompt Engineering", "AI Tools"],
    overview: "Practical AI, not hype. We identify where AI genuinely saves your team time or improves output, then implement it as a working part of your workflow.",
    provides: [
      "AI-assisted content production workflows",
      "AI-assisted website and application development",
      "Prompt engineering and reusable prompt libraries",
      "Business process automation with AI steps",
      "AI-powered internal tools and assistants",
      "Digital workflow automation across existing tools",
      "Team training on responsible AI usage"
    ],
    workflow: [
      "Process audit to find genuine automation opportunities",
      "Pilot implementation on one workflow",
      "Measurement against baseline time and quality",
      "Rollout, documentation and team enablement"
    ],
    deliverables: [
      "Documented AI workflow diagrams",
      "Reusable prompt library",
      "Working automation or AI tool implementation",
      "Team training session and usage guide"
    ],
    industries: ["Agencies", "E-commerce", "Education", "SaaS", "Content teams", "Operations teams"],
    why: [
      "We only ship AI where it measurably helps",
      "Human review built into every automated workflow",
      "Prompt libraries your team can actually reuse",
      "No lock-in — implementations stay yours"
    ],
    faq: [
      { q: "Will AI replace my team?", a: "No. We implement AI to remove repetitive work so your team can focus on judgement, strategy and quality control." },
      { q: "Is our data used to train models?", a: "We configure implementations to avoid training on your data wherever the provider supports it, and document those settings for you." },
      { q: "Where should we start?", a: "With a short process audit. We identify the two or three workflows where AI saves the most time, pilot one, measure it, then expand." }
    ]
  },
  {
    slug: "other-services",
    icon: ico.other,
    title: "Other Freelance Services",
    short: "Something not listed? Tell us what you need — we'll scope it, source the right specialist and deliver it.",
    tags: ["Custom Requests", "Specialist Sourcing", "Flexible"],
    overview: "Our network extends beyond the service lines listed here. If your requirement doesn't fit a category, describe it and we'll assess feasibility, timeline and pricing honestly.",
    provides: [
      "Specialist freelance roles matched to your project",
      "Short-term production support for peak periods",
      "One-off creative or technical tasks",
      "Research, data entry and operational support",
      "Event, podcast and studio support coordination",
      "Ad-hoc consulting and technical reviews"
    ],
    workflow: [
      "You describe the requirement in detail",
      "We confirm feasibility, timeline and budget range",
      "We assign the right specialist and share the plan",
      "Work is delivered and reviewed against the agreed brief"
    ],
    deliverables: [
      "Scope document and timeline",
      "Assigned specialist or team",
      "Delivered work matching the agreed brief",
      "Final handover and support window"
    ],
    industries: ["Any industry", "Startups", "Agencies", "Creators", "Enterprises"],
    why: [
      "No rigid service catalogue limiting your options",
      "Honest feasibility assessment — we decline work we can't do well",
      "Vetted specialists rather than an open marketplace",
      "One point of contact for the whole engagement"
    ],
    faq: [
      { q: "Can you handle very small tasks?", a: "Yes. Small, well-defined tasks are welcome and are often the fastest way to start working together." },
      { q: "How do you price unlisted services?", a: "After reviewing your requirement we send a fixed quote or an hourly estimate with a clear cap. Nothing proceeds without your written approval." },
      { q: "What if you can't deliver it?", a: "We'll tell you upfront and, where possible, point you toward someone who can. We don't take on work we can't complete to standard." }
    ]
  }
];

export const getService = slug => SERVICES.find(s => s.slug === slug) || null;
export const serviceName = slug => getService(slug)?.title || slug || "—";

/* ---------- Render helpers ---------- */
export function serviceCard(s, index = 0) {
  return `
    <article class="card" data-reveal data-reveal-delay="${index * 55}">
      <div class="card-icon">${s.icon}</div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.short)}</p>
      <div class="card-tags">${s.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <a class="card-link" href="service-details.html?s=${encodeURIComponent(s.slug)}">
        View service
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
    </article>`;
}

export function renderServiceGrid(selector, limit = 8) {
  const root = document.querySelector(selector);
  if (!root) return;
  root.innerHTML = SERVICES.slice(0, limit).map((s, i) => serviceCard(s, i)).join("");
  observeReveal(root);
}

export function serviceOptionsHTML(selected = "") {
  return `<option value="">Select a service…</option>` +
    SERVICES.map(s => `<option value="${esc(s.slug)}"${s.slug === selected ? " selected" : ""}>${esc(s.title)}</option>`).join("");
}