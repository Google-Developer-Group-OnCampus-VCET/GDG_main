import type { WorkshopDetails } from "@/types";

export const devcraftWorkshopData: WorkshopDetails = {
  headline: "DevCraft: Architecting Scale with Modern Web, Cloud & AI",
  subheading:
    "A two-day intensive, project-driven developer workshop organized by Google Developer Groups on Campus VCET. Build production-grade cloud apps, master modern web performance, and network with tech leaders.",
  datesText: "Oct 18–19, 2025",
  venueText: "VCET Auditorium & Labs, Vasai",
  seatsText: "Limited to 150 Seats",
  badgeText: "GDG VCET Flagship Hands-on Technical Workshop 2025",
  capacity: 150,
  initialRegisteredCount: 124,
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
  agenda: [
    {
      id: "d1-s1",
      day: 1,
      time: "09:00 AM – 10:00 AM",
      title: "Check-in, Hardware Verification & Morning Tea",
      description:
        "Fast-track QR check-in, environment inspection, swag kit collection, and networking tea with fellow developers.",
      track: "break",
      trackLabel: "Break & Networking",
      location: "VCET Ground Floor Foyer & Auditorium",
      tags: ["Registration", "Tea", "Setup"],
    },
    {
      id: "d1-s2",
      day: 1,
      time: "10:00 AM – 11:30 AM",
      title: "Keynote: Cloud Native Microservices & Resilient Infrastructure",
      description:
        "Analyzing zero-trust cluster topologies, sidecar mesh optimization, enterprise Kubernetes failure mitigation, and distributed scale.",
      track: "keynote",
      trackLabel: "Keynote & Discussion",
      speaker: "Rohan Deshmukh",
      speakerRole: "Lead Cloud Architect, Google Cloud Partner",
      location: "Main Auditorium",
      tags: ["GCP", "Kubernetes", "Architecture", "90 min"],
    },
    {
      id: "d1-s3",
      day: 1,
      time: "11:45 AM – 01:15 PM",
      title: "Deep Dive: React 19 Concurrent Systems & Sub-Second Hydration",
      description:
        "Deep dive into React 19 Server Components, layout animations, compiler auto-memoization, and edge-rendered UI patterns.",
      track: "tech",
      trackLabel: "Technical & Architecture",
      speaker: "Tanvi Patel",
      speakerRole: "Senior Frontend Architect, Web Performance Expert",
      location: "Main Auditorium",
      tags: ["React 19", "Next.js", "Web Vitals", "75 min"],
    },
    {
      id: "d1-s4",
      day: 1,
      time: "01:15 PM – 02:15 PM",
      title: "Networking Lunch & Sponsor Office Hours",
      description:
        "Complimentary buffet lunch for all attendees, mentor 1-on-1 chats, and partner booth interactions.",
      track: "break",
      trackLabel: "Break & Networking",
      location: "Campus Dining & Quadrangle",
      tags: ["Lunch", "Networking", "Sponsors"],
    },
    {
      id: "d1-s5",
      day: 1,
      time: "02:15 PM – 04:15 PM",
      title: "Hands-on Lab: Real-time Multimodal AI with Gemini 1.5 Pro & WebSockets",
      description:
        "Interactive lab: connect to Gemini 1.5 Pro via REST & WebSockets, stream multimodal visual data, and execute structured tool calls.",
      track: "lab",
      trackLabel: "Hands-on Lab",
      speaker: "Pranav Kulkarni & Neha Varma",
      speakerRole: "AI Lab Instructors & VCET Alumni",
      location: "Computer Labs 402 & 403",
      tags: ["Gemini AI", "WebSockets", "Python/TS", "120 min"],
    },
    {
      id: "d1-s6",
      day: 1,
      time: "04:30 PM – 05:30 PM",
      title: "Architecture Sprints & End-of-Day Code Review",
      description:
        "Collaborative code review with mentors, bug squash sessions, and Day 1 capstone repository check-in.",
      track: "tech",
      trackLabel: "Technical & Architecture",
      speaker: "Aditya Nair",
      speakerRole: "DevOps & Cloud Mentor",
      location: "Computer Labs 402 & 403",
      tags: ["Git", "Code Review", "Day 1 Wrap"],
    },
    {
      id: "d2-s1",
      day: 2,
      time: "09:30 AM – 10:00 AM",
      title: "Morning Standup & Day 2 Briefing",
      description:
        "Day 1 recap, architecture troubleshooting, and announcement of the DevCraft Capstone hack challenge.",
      track: "break",
      trackLabel: "Break & Networking",
      location: "Main Auditorium",
      tags: ["Standup", "Morning Refreshments"],
    },
    {
      id: "d2-s2",
      day: 2,
      time: "10:00 AM – 11:30 AM",
      title: "Keynote: Modern Multimodal AI Pipelines in Enterprise Production",
      description:
        "Demystifying production agentic workflows, RAG vector retrieval, latency budgets, and real-time inference optimization.",
      track: "keynote",
      trackLabel: "Keynote & Discussion",
      speaker: "Ananya Sharma",
      speakerRole: "Principal AI Engineer, GDE Machine Learning",
      location: "Main Auditorium",
      tags: ["Agentic AI", "RAG", "Enterprise", "90 min"],
    },
    {
      id: "d2-s3",
      day: 2,
      time: "11:45 AM – 01:30 PM",
      title: "Hands-on Lab: Containerizing Apps with Docker to Google Cloud Run",
      description:
        "Containerize fullstack applications into lean Alpine images, configure Google Artifact Registry, and deploy to auto-scaling Google Cloud Run.",
      track: "lab",
      trackLabel: "Hands-on Lab",
      speaker: "Siddharth Mehta & Sneha Iyer",
      speakerRole: "Staff SRE & Cloud Security Mentors",
      location: "Computer Labs 402 & 403",
      tags: ["Docker", "Google Cloud Run", "CI/CD", "105 min"],
    },
    {
      id: "d2-s4",
      day: 2,
      time: "01:30 PM – 02:30 PM",
      title: "Lunch Break & Capstone Sprint Prep",
      description:
        "Refuel with catered hot lunch and finalize project ideas with assigned team mentors.",
      track: "break",
      trackLabel: "Break & Networking",
      location: "Campus Dining",
      tags: ["Lunch", "Team Sync"],
    },
    {
      id: "d2-s5",
      day: 2,
      time: "02:30 PM – 04:30 PM",
      title: "DevCraft Capstone Sprint: Deploying Live Cloud & AI Projects",
      description:
        "Intensive 2-hour hack sprint building a live product combining React 19, Gemini Multimodal API, and Google Cloud Run.",
      track: "lab",
      trackLabel: "Hands-on Lab",
      speaker: "All Mentors & Instructors",
      speakerRole: "DevCraft Mentor Council",
      location: "Computer Labs 402 & 403",
      tags: ["Hackathon", "Cloud Run", "Live Demo", "120 min"],
    },
    {
      id: "d2-s6",
      day: 2,
      time: "04:30 PM – 05:30 PM",
      title: "Project Showcase, Judging, Awards & Certificate Ceremony",
      description:
        "Top project demos on the main stage, sponsor prize distribution, organizer wrap-up, and certificate distribution.",
      track: "keynote",
      trackLabel: "Keynote & Discussion",
      speaker: "GDG VCET Leads & Guest Judges",
      speakerRole: "Organizing Committee",
      location: "Main Auditorium",
      tags: ["Demos", "Prizes", "Certificates", "Ceremony"],
    },
  ],
  speakers: [
    {
      id: "rohan-deshmukh",
      name: "Rohan Deshmukh",
      role: "Lead Cloud Architect",
      organization: "Google Cloud Partner",
      badge: "Google Cloud Partner",
      category: "keynote",
      topicTitle: "Cloud Native Microservices & Resilient Infrastructure",
      topicDescription:
        "Analyzing zero-trust cluster topologies, sidecar mesh optimization, and enterprise Kubernetes failure mitigation.",
      tags: ["GCP", "Kubernetes", "Go", "90 min"],
      photo:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCDNkbi1WvHcsaEkHQVFRHoO2P41GyUjMViByqqHGlr3M-NcPMBYvIDjPjt9Tcu54U0Dy3lgWpCqHWtkaic8rYUVmfp465yQMb1L_5YZu16zUNgKr5XrTGyJ0xbTXVT4-UE5pDlmOqofpIugnO3nJAbIt65wu--x4ljsZBtpdt-85BcRFpRxwN4XbJ--dXwVGssAJeECEqoEMcuWurjPhzlk7C-vX0BFPTm5eDgfNc",
      socials: {
        linkedin: "https://linkedin.com",
        github: "https://github.com",
      },
    },
    {
      id: "ananya-sharma",
      name: "Ananya Sharma",
      role: "Principal AI Engineer",
      organization: "Google Developer Expert",
      badge: "GDE Machine Learning",
      category: "keynote",
      topicTitle: "Multimodal AI & Real-time Vision Pipelines with Gemini 1.5 Pro",
      topicDescription:
        "Unpacking streaming function calls, system instruction design, and low-latency agent architectures.",
      tags: ["Gemini 1.5", "Python", "Computer Vision", "90 min"],
      photo:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDC13f3_2wz_h1qVfJ33H6kY9f8tI8k-HlA9Lz1m2z3x4c5v6b7n8m9",
      socials: {
        linkedin: "https://linkedin.com",
        github: "https://github.com",
      },
    },
    {
      id: "siddharth-mehta",
      name: "Siddharth Mehta",
      role: "Staff SRE",
      organization: "Cloud Scale Inc.",
      badge: "Distributed Systems",
      category: "keynote",
      topicTitle: "Zero-Downtime Releases: Kubernetes, Istio & ArgoCD at Scale",
      topicDescription:
        "Practical insights into canary rollouts, automated rollbacks, and high-availability cloud architecture.",
      tags: ["Docker", "Cloud Run", "Terraform", "75 min"],
      photo:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDC13f3_2wz_h1qVfJ33H6kY9f8tI8k-HlA9Lz1m2z3x4c5v6b7n8m9",
      socials: {
        linkedin: "https://linkedin.com",
        github: "https://github.com",
      },
    },
    {
      id: "tanvi-patel",
      name: "Tanvi Patel",
      role: "Senior Frontend Architect",
      organization: "Web Performance Expert",
      badge: "Web Performance Expert",
      category: "keynote",
      topicTitle: "React 19 & Next.js: Concurrent Rendering & Sub-Second Hydration",
      topicDescription:
        "Deep dive into React 19 compiler internals, optimistic UI states, and hitting 100 on Core Web Vitals.",
      tags: ["React 19", "Next.js", "Web Vitals", "75 min"],
      photo:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDC13f3_2wz_h1qVfJ33H6kY9f8tI8k-HlA9Lz1m2z3x4c5v6b7n8m9",
      socials: {
        linkedin: "https://linkedin.com",
        github: "https://github.com",
      },
    },
    {
      id: "pranav-kulkarni",
      name: "Pranav Kulkarni",
      role: "Full-Stack Engineer",
      organization: "VCET Alum '22",
      badge: "Lab Mentor",
      category: "hands-on",
      topicTitle: "React 19 & Next.js Hands-on Sprints",
      topicDescription: "Guiding attendees through Server Components and optimistic state architectures.",
      tags: ["React 19", "Next.js", "TypeScript"],
      socials: {
        github: "https://github.com",
      },
    },
    {
      id: "neha-varma",
      name: "Neha Varma",
      role: "AI Research Engineer",
      organization: "VCET Alum '23",
      badge: "Lab Mentor",
      category: "hands-on",
      topicTitle: "Gemini 1.5 Pro Hands-on Lab",
      topicDescription: "Hands-on instruction on multimodal prompting, JSON schemas, and function calling.",
      tags: ["Gemini AI", "Prompt Engineering", "Python"],
      socials: {
        github: "https://github.com",
      },
    },
    {
      id: "aditya-nair",
      name: "Aditya Nair",
      role: "DevOps & Cloud Engineer",
      organization: "Tech Corp",
      badge: "Technical Mentor",
      category: "mentors",
      topicTitle: "Docker & Containerization Sprint",
      topicDescription: "Helping participants containerize their projects and debug Docker network layers.",
      tags: ["Docker", "Linux", "GCP"],
      socials: {
        github: "https://github.com",
      },
    },
    {
      id: "sneha-iyer",
      name: "Sneha Iyer",
      role: "Cloud Security Engineer",
      organization: "SecureCloud",
      badge: "Technical Mentor",
      category: "mentors",
      topicTitle: "Zero-Trust API Security",
      topicDescription: "Hands-on guidance for authentication, CORS, and secret management in modern apps.",
      tags: ["Security", "OAuth", "API"],
      socials: {
        github: "https://github.com",
      },
    },
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
  sponsors: [
    {
      id: "google-cloud",
      name: "Google Cloud",
      tier: "title",
      badge: "Premier Title Sponsor",
      description:
        "Providing $50,000+ in cloud runtime credits, access to Vertex AI Gemini endpoints, technical mentor sponsorship, and official GDG swag packs.",
      perks: [
        "$50,000 in GCP student credits",
        "Direct engineer mentoring pipeline",
        "Official verified completion certificates",
        "Cloud Run runtime hosting",
      ],
      contribution: "Anchor Support & Cloud Credits",
    },
    {
      id: "devforge",
      name: "DevForge",
      tier: "gold",
      badge: "Gold Sponsor",
      description:
        "Cloud IDE and rapid container prototyping platform providing pro subscriptions to all DevCraft attendees for 6 months.",
      perks: ["Cloud IDE pro access", "Container instant staging", "Lab workspace credits"],
      contribution: "$15,000 Tooling Sponsorship",
    },
    {
      id: "codepulse",
      name: "CodePulse",
      tier: "gold",
      badge: "Gold Sponsor",
      description:
        "Real-time application observability and performance monitoring platform sponsoring developer prize grants.",
      perks: ["APM telemetry credits", "Cash prize grants for top demo", "Student licenses"],
      contribution: "$10,000 Student Grants",
    },
    {
      id: "github-education",
      name: "GitHub Education",
      tier: "platform",
      badge: "Platform Partner",
      description:
        "Providing GitHub Copilot access and GitHub Student Developer Packs for all registered attendees.",
      perks: ["GitHub Copilot access", "Student Developer Packs", "GitHub swag"],
      contribution: "Developer Tooling & Copilot",
    },
    {
      id: "postman",
      name: "Postman Student Programs",
      tier: "platform",
      badge: "Platform Partner",
      description:
        "Free Postman API platform access and opportunity to earn verified Postman Student Expert badges.",
      perks: ["API testing workspaces", "Student Expert Certification", "API training kits"],
      contribution: "API Platform & Certifications",
    },
    {
      id: "jetbrains",
      name: "JetBrains",
      tier: "platform",
      badge: "Tooling Partner",
      description:
        "Complimentary 1-year licenses for JetBrains All Products Pack (WebStorm, IntelliJ IDEA, PyCharm).",
      perks: ["1-year All Products Pack licenses", "IDE plugins", "Educational resources"],
      contribution: "IDE Licenses for Attendees",
    },
    {
      id: "vercel",
      name: "Vercel",
      tier: "platform",
      badge: "Platform Partner",
      description:
        "High-performance edge deployment platform providing Next.js hosting credits and domain perks.",
      perks: ["Edge deployment credits", "Fast CDN hosting", "Next.js support"],
      contribution: "Edge Hosting Credits",
    },
    {
      id: "vcet-iic",
      name: "VCET Innovation & Incubation Center",
      tier: "ecosystem",
      badge: "Academic Partner",
      description: "College incubation wing fostering student entrepreneurship and hardware labs.",
      contribution: "Campus Infrastructure & Incubation Support",
    },
    {
      id: "vcet-council",
      name: "VCET Student Council",
      tier: "ecosystem",
      badge: "Collegiate Partner",
      description: "Student governing body facilitating cross-departmental student participation.",
      contribution: "Inter-collegiate Coordination",
    },
  ],
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

