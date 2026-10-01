// Everything the website says about Appfinity AI Studio, condensed for the chat assistant.
// Keep this in sync with the site pages (src/pages/*) when content changes.

export const CONTACT = {
  email: "info@appfinityaistudio.com",
  phone: "+91 93213 64060",
  whatsapp: "https://wa.me/919321364060",
};

export const SITE_KNOWLEDGE = `
# Appfinity AI Studio — company facts

## Who we are
- Appfinity AI Studio is a technology studio that builds AI-powered apps, web and SaaS platforms, mobile apps and automation solutions. Tagline: "Building AI-Powered Apps & Digital Solutions".
- "We build intelligent web and mobile products and automation tools that help businesses scale." We help teams ship high-quality software faster.
- Expertise: AI & intelligent automation, mobile & web development, cloud solutions, and UI/UX design.
- Mission: democratize AI and make sophisticated technology accessible to businesses of all sizes; bridge the gap between complex technology and user-friendly applications.
- Track record: 2+ years of experience, 10+ projects delivered, 6 services offered.
- Core values: Innovation First, Quality Driven, Client-Centric, Creative Solutions.
- Based in Mumbai, India. Address: Heaven Plaza, S.V. Road, Dahisar, Mumbai 400068, Maharashtra, India.
- MSME registered with the Government of India (Udyam Reg. No: UDYAM-MH-18-0507003).
- Open to new projects and collaborations.

## Services (6)
1. AI-Powered Application Development — intelligent apps that use AI to deliver personalised experiences and data-driven insights.
2. Web & SaaS Development — modern web platforms and SaaS products with scalable architectures and strong security.
3. Mobile App Development — native-like mobile apps for Android and iOS with a focus on performance and UX.
4. Automation & AI Integrations — automating workflows and integrating AI into existing systems (e.g. lead capture, support workflows, data pipelines, internal tools).
5. Custom Digital Solutions — tailored software to solve specific business challenges and drive growth.
6. UI/UX Design & Prototyping — user-centered design: wireframes, clickable prototypes and production-ready UI systems.

## Products
2 products are live; the others are in development (always say which is which).

Live:
- FitnessMate (LIVE on Google Play) — "Your AI-Powered Fitness Companion". Personalized workout plans, nutrition tracking & meal plans, progress analytics & insights, community challenges. https://play.google.com/store/apps/details?id=app.netlify.fitnessmate.twa
- Next Frame Casting (LIVE) — "Casting Made Simple". Connects talent with opportunities: advanced talent search, digital portfolio management, audition scheduling, real-time collaboration tools. https://nextframecasting.netlify.app/

In development (not launched yet; the links show the current in-progress version):
- WorldLens (IN DEVELOPMENT) — "AI Travel Companion (PWA)". Being built to help travelers understand places and explore confidently: AI-powered travel companion, area safety info & alerts, mobile-first PWA, smart travel insights. https://worldailens.netlify.app/
- Ascend CRM (IN DEVELOPMENT) — "AI-First CRM Platform" for modern teams: AI-assisted workflows, multi-tenant isolation, enterprise security focus, workspace-based access. https://ascendaicrm.netlify.app/
- More AI products are in development — updates on GitHub: https://github.com/RaheemD

## How we work
- Engagement models: fixed-price projects, hourly consulting, and retainer agreements.
- Pricing depends on scope, timeline and complexity. There is no public price list — the team shares a proposal after understanding the project.
- Technologies we use (from our engineering blog): React, TypeScript, Tailwind CSS, Radix UI, TanStack Query for web apps; n8n and Zapier for automation; AI/ML models for personalization and intelligent features.

## Blog (/blog)
- A daily AI-generated spotlight on the latest AI models, plus articles:
  - "Building AI-Powered Fitness Applications" (/blog/building-ai-fitness-apps) — lessons from FitnessMate: adaptive plans, quality input data, fast inference, explaining AI decisions to users.
  - "Our Modern Web Technology Stack" (/blog/modern-web-tech-stack) — why we use React + TypeScript, Tailwind CSS with Radix UI, and TanStack Query.
  - "Automation Tools for Business Efficiency" (/blog/automation-business-efficiency) — "If you do it more than three times, automate it"; auditing workflows, n8n/Zapier pipelines (e.g. form → CRM → Slack → email follow-up); clients often report 30-40% less admin overhead.

## Contact
- Email: ${CONTACT.email}
- Phone: ${CONTACT.phone}
- WhatsApp: ${CONTACT.whatsapp}
- Contact form: /contact. We typically respond within 1-2 business days; mark urgent matters in the message.

## Website pages
Home (/), Products (/products), Services (/services), Blog (/blog), About (/about), Contact (/contact), Privacy Policy (/privacy), Terms of Service (/terms).

## Legal summary
- Privacy: we collect only what visitors provide (e.g. name, email) and basic usage data; we do not sell personal data; services are not directed at children under 13; visitors can ask to access, correct or delete their data. Full policy: /privacy
- Terms: services provided "as is"; in-app purchases follow Apple App Store / Google Play policies. Full terms: /terms
`.trim();
