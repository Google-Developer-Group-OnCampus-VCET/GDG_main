import type { WorkshopDetails } from "@/types";

export const devcraftWorkshopData: WorkshopDetails = {
  headline: "DevCraft: Architecting Scale with Modern Web, Cloud & AI",
  subheading:
    "A two-day intensive, project-driven developer workshop organized by Google Developer Groups on Campus VCET. Build production-grade cloud apps, master modern web performance, and network with tech leaders.",
  datesText: "Nov 20–21, 2026",
  venueText: "VCET Vasai · Auditorium & Labs 402",
  seatsText: "Limited to 150 Seats",
  badgeText: "GDG VCET Flagship Hands-on Technical Workshop",
  capacity: 150,
  // No real registration count exists before the event opens — this is a floor, not a
  // placeholder claim. Live pages always prefer the real DB count (see stats? in the
  // consuming views) and only fall back to this when stats genuinely aren't available.
  initialRegisteredCount: 0,
  heroGraphic: {
    terminalLabel: "devcraft_2025.sh",
    versionBadge: "BATCH '25",
  },
  pillars: [
    {
      title: "Modern Web Architecture",
      description:
        "Master React 19 concurrent actions, Server Components, sub-second hydration, and edge-rendered streaming user interfaces.",
      icon: "code",
      tags: ["React 19", "Next.js 15", "Turbopack", "Edge"],
      color: "blue",
    },
    {
      title: "Gemini Multimodal AI",
      description:
        "Harness Google Gemini 1.5 Pro with structured JSON outputs, function calling, multimodal audio/vision pipelines, and WebSockets.",
      icon: "psychology",
      tags: ["Gemini 1.5", "Function Calling", "Multimodal", "Embeddings"],
      color: "green",
    },
    {
      title: "Resilient Cloud & GCP",
      description:
        "Containerize microservices with Docker, deploy to serverless Google Cloud Run, and automate CI/CD with Google Cloud Build.",
      icon: "cloud",
      tags: ["Cloud Run", "Docker", "GCP CI/CD", "Artifact Registry"],
      color: "yellow",
    },
    {
      title: "Production Readiness",
      description:
        "Implement enterprise zero-trust auth, OAuth 2.0 PKCE, distributed caching, and end-to-end telemetry observability.",
      icon: "security",
      tags: ["OAuth 2.0", "Redis", "OpenTelemetry", "Zero-Trust"],
      color: "red",
    },
  ],
  learningObjectives: [
    {
      title: "Master React 19 & Next.js Architecture",
      description:
        "Implement Server Actions, optimistic UI mutations, and server-side streaming responses with zero waterfalls.",
      color: "blue",
    },
    {
      title: "Integrate Gemini 1.5 Pro Multimodal APIs",
      description:
        "Feed real-time documents, audio, and visual inputs into Gemini models using function calling and system instructions.",
      color: "green",
    },
    {
      title: "Deploy Containerized Apps to Google Cloud",
      description:
        "Write minimal multi-stage Dockerfiles and deploy microservices to auto-scaling Google Cloud Run instances.",
      color: "yellow",
    },
    {
      title: "Harden Production Security & Auth",
      description:
        "Configure secure session cookies, JWT rotation, CORS policies, and rate-limiting to prevent common exploits.",
      color: "red",
    },
    {
      title: "Benchmark & Optimize Web Performance",
      description:
        "Measure and hit straight-A Google Core Web Vitals (LCP, INP, CLS) using automated Lighthouse audits.",
      color: "blue",
    },
    {
      title: "Collaborative Git & CI/CD Workflows",
      description:
        "Work in team branches, conduct pull request reviews, and set up automated preview environments via GitHub Actions.",
      color: "green",
    },
  ],
  personas: [
    {
      role: "Collegiate Web Builders",
      description:
        "Students who know standard HTML/JS and want to transition into building modern production-grade fullstack web applications.",
      gain: "Hands-on mastery of Next.js App Router, React 19, and fullstack cloud deployment patterns.",
      badge: "Fullstack Track",
    },
    {
      role: "AI & Cloud Enthusiasts",
      description:
        "Developers eager to move beyond basic chatbot prompts and build autonomous AI agents powered by Gemini APIs.",
      gain: "Real-world experience with system prompting, structured schema outputs, and cloud scale.",
      badge: "AI/ML Track",
    },
    {
      role: "Aspiring Software Engineers",
      description:
        "Engineering students preparing for tech internships and placements who need standout portfolio projects.",
      gain: "A live, deployed capstone project on your GitHub with verified GDG on Campus credentials.",
      badge: "Career Accelerant",
    },
  ],
  prepRequirements: [
    {
      category: "Hardware Requirements",
      icon: "laptop_mac",
      items: [
        "Laptop with at least 8 GB RAM (16 GB recommended)",
        "Minimum 20 GB free disk space for Docker containers",
        "Functional webcam & microphone for collaborative sprint checkpoints",
        "Laptop charger and multi-pin adapter",
      ],
    },
    {
      category: "Required Software Setup",
      icon: "terminal",
      items: [
        "Node.js 20 LTS or higher installed",
        "Git configured with your personal GitHub account",
        "VS Code or JetBrains WebStorm / IntelliJ",
        "Docker Desktop or OrbStack running locally",
      ],
    },
    {
      category: "Accounts & Credentials",
      icon: "vpn_key",
      items: [
        "Active Google account (for Google Cloud credits redemption)",
        "Verified GitHub student account (for GitHub Education pack perks)",
        "Postman account for API testing labs",
      ],
    },
    {
      category: "Recommended Prior Knowledge",
      icon: "school",
      items: [
        "Foundational JavaScript/TypeScript syntax (functions, promises, async/await)",
        "Basic familiarity with terminal commands (cd, git clone, npm install)",
        "No prior Docker or Gemini experience required — covered from ground up!",
      ],
    },
  ],
  faq: [
    {
      question: "Is DevCraft 2025 really free of charge?",
      answer:
        "Yes! DevCraft is 100% free for students thanks to our generous sponsors Google Cloud, DevForge, GitHub Education, and VCET. Lunch, snacks, cloud credits, and swag are all included.",
      category: "General",
    },
    {
      question: "Can students from non-VCET colleges attend?",
      answer:
        "Yes! While VCET students receive priority allocation, cross-college engineering students from Mumbai University and other institutions are warmly welcomed.",
      category: "Eligibility",
    },
    {
      question: "Do I need an advanced coding background to participate?",
      answer:
        "Not at all. If you know basic programming (loops, variables, functions in JavaScript, Python, or C++), our mentors will guide you through the modern framework and cloud tools step-by-step.",
      category: "Prerequisites",
    },
    {
      question: "Will I receive a certificate of completion?",
      answer:
        "Yes, every attendee who completes both workshop days and submits the hands-on capstone project will receive an official GDG on Campus VCET Certificate of Completion.",
      category: "Certification",
    },
    {
      question: "What should I bring to the workshop?",
      answer:
        "Bring your laptop with charger, your college ID card, and your digital attendee pass (either printed or saved on your phone with the QR code ready for check-in).",
      category: "Logistics",
    },
    {
      question: "How do tracks work? Can I attend sessions from both?",
      answer:
        "Keynotes and general sessions are shared by all attendees. During the afternoon hands-on lab blocks, participants divide into their preferred lab rooms (Track A: Web/AI in Lab 402; Track B: Cloud/DevOps in Lab 403).",
      category: "Tracks",
    },
  ],
  // No real agenda has been finalized yet for this cohort — an invented two-day schedule
  // with fabricated speaker names used to live here. Populate this once the real agenda
  // is confirmed; see docs/content-needed.md.
  agenda: [],
  // Only the real GDG on Campus VCET organizing leads are listed below (verified against
  // src/content/team.ts). The keynote/hands-on/mentor speaker lineup for this cohort hasn't
  // been confirmed yet — fabricated placeholder speakers (with duplicated stock photo URLs
  // and generic social links) used to live here. See docs/content-needed.md.
  speakers: [
    {
      id: "jatush-hingu",
      name: "Jatush Hingu",
      role: "GDGoC Organizer",
      organization: "GDG on Campus VCET",
      badge: "Lead Organizer",
      category: "leads",
      topicTitle: "Community Lead & Opening Remarks",
      tags: ["Community", "Leadership", "Event Chair"],
      photo: "/images/team/jatush-hingu.jpg",
    },
    {
      id: "dhruv-jain",
      name: "Dhruv Jain",
      role: "GDGoC Organizer",
      organization: "GDG on Campus VCET",
      badge: "Technical Head",
      category: "leads",
      topicTitle: "Workshop Curriculum & Labs Overseer",
      tags: ["Technical Lead", "Architecture"],
      photo: "/images/team/dhruv-jain.jpg",
    },
    {
      id: "sahil-dhavale",
      name: "Sahil Dhavale",
      role: "GDGoC Organizer",
      organization: "GDG on Campus VCET",
      badge: "Operations Lead",
      category: "leads",
      topicTitle: "Logistics, Hardware & Venue Operations",
      tags: ["Operations", "Logistics"],
      photo: "/images/team/sahil-dhavale.jpg",
    },
    {
      id: "suraj-phirke",
      name: "Suraj Phirke",
      role: "Web Lead",
      organization: "GDG on Campus VCET",
      badge: "Web Lead",
      category: "leads",
      topicTitle: "Developer Experience & Web Platform",
      tags: ["Web Dev", "Fullstack"],
      photo: "/images/team/suraj-phirke.jpg",
    },
  ],
  // No sponsor has actually confirmed for this cohort yet — a fabricated sponsor roster
  // with invented dollar amounts used to live here. See docs/content-needed.md.
  sponsors: [],
  registrationConfig: {
    isOpen: true,
    price: 0,
    currency: "INR",
    tracks: [
      {
        id: "track-a",
        name: "Track A: Modern Web & Gemini AI",
        description:
          "Deep dive into React 19 concurrent features, client state, and integrating Google Gemini 1.5 Pro via REST & WebSockets.",
        badge: "TRACK A",
        icon: "code",
      },
      {
        id: "track-b",
        name: "Track B: Cloud Architecture & GCP",
        description:
          "Microservices deployment, Docker containerization, Google Cloud Run scaling, and CI/CD pipelines.",
        badge: "TRACK B",
        icon: "cloud_sync",
      },
    ],
    departments: [
      "Computer Engineering",
      "Information Technology",
      "Artificial Intelligence & Data Science",
      "Electronics & Telecommunication",
      "Other Engineering Branch / MCA",
    ],
    yearsOfStudy: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    experienceLevels: [
      "Beginner (Knows basics of syntax)",
      "Intermediate (Built a few projects)",
      "Advanced (Shipped production code)",
    ],
  },
};

