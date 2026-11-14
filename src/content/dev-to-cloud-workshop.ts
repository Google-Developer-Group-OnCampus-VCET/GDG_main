import type { WorkshopDetails } from "@/types";

export const devToCloudWorkshopData: WorkshopDetails = {
  headline: "Dev to Cloud: Zero to Hero",
  subheading:
    "A four-day intensive, hands-on workshop series organized by Google Developer Groups on Campus VCET. Take your application from local code to a smart, containerized, serverless AI agent deployed on Google Cloud.",
  datesText: "Dec 1–4, 2026",
  venueText: "VCET Seminar Hall & Computer Labs, Vasai",
  seatsText: "Limited to 150 Seats",
  badgeText: "GDG VCET Flagship Hands-on Series · Dec 1–4, 2026",
  capacity: 150,
  initialRegisteredCount: 0,
  showSponsors: false,
  speakersTbd: true,
  heroGraphic: {
    terminalLabel: "dev_to_cloud.sh",
    versionBadge: "04 DAYS · 01 PROJECT",
  },
  pillars: [
    {
      title: "Day 1: Build the Foundation",
      description:
        "Set up the workspace, bring the frontend, backend API, and database together locally. Build a responsive chat panel, file upload form, and documents table with Git best practices.",
      icon: "code",
      tags: ["React & Node", "REST API", "Database", "Git / GitHub"],
      color: "blue",
    },
    {
      title: "Day 2: Make It Smart",
      description:
        "Embed campus data into Firestore vector search, implement Grounded RAG with source citations, build tool-using agents with Google ADK / LangGraph, and test prompt-injection resilience.",
      icon: "psychology",
      tags: ["RAG", "Embeddings", "Tool Use", "Prompt Evals"],
      color: "green",
    },
    {
      title: "Day 3: Ship It to the Cloud",
      description:
        "Package the fullstack app and agent with Docker, deploy to serverless Google Cloud Run, secure secrets in Secret Manager, configure active budget alerts, and automate CI/CD.",
      icon: "cloud",
      tags: ["Docker", "Cloud Run", "Secret Manager", "GitHub Actions"],
      color: "yellow",
    },
    {
      title: "Day 4: Harden and Prove It",
      description:
        "Audit the agent-built app against production security checklists, compare against reviewed architectures, run live project demos, and earn GDG certificates for working deployments.",
      icon: "security",
      tags: ["Security Audit", "Architecture", "Live Demos", "Certificates"],
      color: "red",
    },
  ],
  learningObjectives: [
    {
      title: "Fullstack Architecture & Core Experience",
      description:
        "Connect client UI, backend REST endpoints, and database storage for an AI-ready campus notes and events assistant.",
      color: "blue",
    },
    {
      title: "Retrieval-Augmented Generation (RAG)",
      description:
        "Embed unstructured campus documents and synthesize trustworthy answers with verbatim source references.",
      color: "green",
    },
    {
      title: "Autonomous Tool-Using AI Agents",
      description:
        "Equip agents with real action tools like search_notes, list_events, and set_reminder using Google ADK or LangGraph.",
      color: "green",
    },
    {
      title: "Serverless Containerization on Cloud Run",
      description:
        "Write production-grade Dockerfiles, deploy microservices to Google Cloud Run, and scale to zero during idle periods.",
      color: "yellow",
    },
    {
      title: "Production Secrets & Spend Governance",
      description:
        "Store API keys in Google Cloud Secret Manager and implement budget alerts and instance limits to eliminate surprise costs.",
      color: "yellow",
    },
    {
      title: "Security Hardening & Live Demo Audits",
      description:
        "Verify input sanitization, prompt-injection defense, rate-limiting, and error handling before shipping live to users.",
      color: "red",
    },
  ],
  personas: [
    {
      role: "Students",
      description: "Engineering students looking to learn fullstack web development and AI from scratch.",
      gain: "Hands-on project experience and certificate.",
      badge: "Students",
    },
    {
      role: "Developers",
      description: "Coders and builders interested in RAG, autonomous agents, and cloud deployments.",
      gain: "Practical experience with Gemini, Cloud Run, and CI/CD.",
      badge: "Developers",
    },
    {
      role: "Beginners",
      description: "Anyone with basic programming knowledge wanting to deploy real applications.",
      gain: "Step-by-step guidance from mentors and daily starter code.",
      badge: "Beginners",
    },
  ],
  prepRequirements: [
    {
      category: "Hardware Requirements",
      icon: "laptop_mac",
      items: [
        "Laptop with at least 8 GB RAM (16 GB recommended)",
        "Minimum 15 GB free disk space for Docker images and project dependencies",
        "Laptop charger and multi-pin power adapter",
        "Mobile phone with hotspot capability as a venue Wi-Fi backup",
      ],
    },
    {
      category: "Required Software Setup",
      icon: "terminal",
      items: [
        "VS Code, Cursor, or any modern code editor installed",
        "Node.js 20 LTS or Python 3.11+ installed as detailed in the setup guide",
        "Git installed with user.name and user.email configured",
        "Docker Desktop installed (or Google Cloud Shell confirmed as browser fallback)",
      ],
    },
    {
      category: "Accounts & Cloud Credentials",
      icon: "vpn_key",
      items: [
        "Active personal Google account (college-managed accounts often restrict Cloud billing)",
        "Verified GitHub account for forking starter repos and running Actions",
        "Google Cloud account (or use Google Cloud Shell / shared project environment)",
        "Gemini API key obtained via Google AI Studio",
      ],
    },
    {
      category: "Prerequisites & Smoke Test",
      icon: "school",
      items: [
        "Foundational programming understanding (variables, loops, functions)",
        "Basic familiarity with command-line commands (cd, git clone, npm install)",
        "Complete the 5-minute pre-event smoke test from the setup guide",
      ],
    },
  ],
  faq: [
    {
      question: "What will we build during the 4 days?",
      answer:
        "You will build one cohesive project from start to finish: an AI-powered Campus Notes and Events Assistant. Day 1 sets up the fullstack application; Day 2 integrates RAG and autonomous tools; Day 3 deploys to Google Cloud Run with CI/CD; and Day 4 audits, hardens, and demos the working app.",
      category: "Project",
    },
    {
      question: "What happens if I get stuck or miss a step?",
      answer:
        "Every single day has dedicated starter branches (day1-start, day2-start, day3-start, day3-complete). If you fall behind, you can switch branches instantly to catch up, and roving floor mentors from the Web, AI, and Cloud teams are always on hand to assist.",
      category: "Mentorship",
    },
    {
      question: "Is this workshop free to attend?",
      answer:
        "Yes! Dev to Cloud: Zero to Hero is 100% free for all selected participants, organized by GDG on Campus VCET with hands-on mentoring.",
      category: "General",
    },
    {
      question: "What is the workshop schedule?",
      answer:
        "The workshop runs across 4 days (Dec 1 to Dec 4, 2026), structured with concept primers, guided builds, hands-on lab sprints, and daily verification checkpoints.",
      category: "Schedule",
    },
    {
      question: "Who receives a Certificate of Completion?",
      answer:
        "Certificates are awarded to attendees who complete all 4 days and demonstrate a working, audited deployment during the Day 4 showcase.",
      category: "Certification",
    },
    {
      question: "What if I cannot set up a personal Google Cloud account?",
      answer:
        "No problem! We provide access to a shared organizer project environment with sandboxed credentials and Google Cloud Shell so that no student is blocked.",
      category: "Cloud Setup",
    },
  ],
  agenda: [
    // DAY 1
    {
      id: "d1-s1",
      day: 1,
      time: "10:00 AM – 10:30 AM",
      title: "Concept Primer: Anatomy of Modern Web Applications",
      description:
        "Deconstructing frontend, REST APIs, and databases. How requests flow end-to-end, REST conventions, and how to structure data models for AI agents.",
      track: "keynote",
      trackLabel: "Senior Primer",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Seminar Hall",
      tags: ["Web Architecture", "REST", "Git", "30 min"],
    },
    {
      id: "d1-s2",
      day: 1,
      time: "10:30 AM – 11:30 AM",
      title: "Guided Build: Workspace Setup & Core Screens",
      description:
        "Clone starter repo, install dependencies, run locally, and construct the chat panel, file upload form, and notes view.",
      track: "tech",
      trackLabel: "Guided Build",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Computer Labs",
      tags: ["React", "API Routes", "UI Components", "60 min"],
    },
    {
      id: "d1-s3",
      day: 1,
      time: "11:30 AM – 11:40 AM",
      title: "Mid-Session Refreshment Break",
      description: "Quick coffee and networking break.",
      track: "break",
      trackLabel: "Break",
      location: "Seminar Foyer",
      tags: ["Refreshments", "10 min"],
    },
    {
      id: "d1-s4",
      day: 1,
      time: "11:40 AM – 12:50 PM",
      title: "Hands-on Lab: Feature Implementation & Agent Documents Table",
      description:
        "Build notes search, event filter queries, and create the documents table and upload endpoint that the AI agent will consume on Day 2.",
      track: "lab",
      trackLabel: "Hands-on Lab",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Computer Labs",
      tags: ["Database", "CRUD", "Documents Table", "70 min"],
    },
    {
      id: "d1-s5",
      day: 1,
      time: "12:50 PM – 01:10 PM",
      title: "Day 1 Checkpoint & Day 2 Preview",
      description:
        "Commit changes to Git, push day1-complete branch to GitHub, verify running local application with mentors, and preview AI concepts.",
      track: "tech",
      trackLabel: "Checkpoint",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Seminar Hall",
      tags: ["Git Push", "Verification", "Day 2 Preview", "20 min"],
    },

    // DAY 2
    {
      id: "d2-s1",
      day: 2,
      time: "10:00 AM – 10:30 AM",
      title: "Concept Primer: LLMs, Embeddings, RAG & Autonomous Agents",
      description:
        "How large language models work, dense embeddings vs keyword search, vector distance metrics, agent tool dispatching, and safety guardrails.",
      track: "keynote",
      trackLabel: "Senior Primer",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Seminar Hall",
      tags: ["GenAI", "Embeddings", "RAG", "Guardrails", "30 min"],
    },
    {
      id: "d2-s2",
      day: 2,
      time: "10:30 AM – 11:30 AM",
      title: "Guided Build: Firestore Vector Store & Tool-Calling Agent",
      description:
        "Ingest campus notices and FAQs into vector storage, implement Grounded RAG with citations, and bind actions (search_notes, list_events, set_reminder).",
      track: "tech",
      trackLabel: "Guided Build",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Computer Labs",
      tags: ["Google ADK", "LangGraph", "Vector Search", "60 min"],
    },
    {
      id: "d2-s3",
      day: 2,
      time: "11:30 AM – 11:40 AM",
      title: "Mid-Session Refreshment Break",
      description: "Quick break and lab synchronization.",
      track: "break",
      trackLabel: "Break",
      location: "Seminar Foyer",
      tags: ["Refreshments", "10 min"],
    },
    {
      id: "d2-s4",
      day: 2,
      time: "11:40 AM – 12:50 PM",
      title: "Hands-on Lab: Custom Agent Tools & Prompt-Injection Evals",
      description:
        "Add a custom tool, write 10-15 test evaluation queries, benchmark answer quality, and run prompt-injection attacks to test safety guardrails.",
      track: "lab",
      trackLabel: "Hands-on Lab",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Computer Labs",
      tags: ["Custom Tools", "Evals", "Prompt Injection", "70 min"],
    },
    {
      id: "d2-s5",
      day: 2,
      time: "12:50 PM – 01:10 PM",
      title: "Day 2 Checkpoint & Stretch Preview",
      description:
        "Live demo answering queries with citations and executing tool actions. Preview Day 3 Cloud deployment and explore local Gemma/Ollama stretch goals.",
      track: "tech",
      trackLabel: "Checkpoint",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Seminar Hall",
      tags: ["Demo", "Gemma", "Day 3 Preview", "20 min"],
    },

    // DAY 3
    {
      id: "d3-s1",
      day: 3,
      time: "10:00 AM – 10:30 AM",
      title: "Concept Primer: Containers, Serverless & Production CI/CD",
      description:
        "Containers vs virtual machines, why serverless scales to zero, IAM least privilege, why secrets never go into Git, and continuous delivery flows.",
      track: "keynote",
      trackLabel: "Senior Primer",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Seminar Hall",
      tags: ["Cloud Run", "Docker", "IAM", "Secrets", "30 min"],
    },
    {
      id: "d3-s2",
      day: 3,
      time: "10:30 AM – 11:30 AM",
      title: "Guided Build: Multi-Stage Dockerfile & Cloud Run Deployment",
      description:
        "Write minimal multi-stage Dockerfiles, configure GCP project, establish budget alerts, deploy to Google Cloud Run, and mount Secret Manager keys.",
      track: "tech",
      trackLabel: "Guided Build",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Computer Labs",
      tags: ["Cloud Run", "Secret Manager", "Budget Alerts", "60 min"],
    },
    {
      id: "d3-s3",
      day: 3,
      time: "11:30 AM – 11:40 AM",
      title: "Mid-Session Refreshment Break",
      description: "Quick break and deployment check.",
      track: "break",
      trackLabel: "Break",
      location: "Seminar Foyer",
      tags: ["Refreshments", "10 min"],
    },
    {
      id: "d3-s4",
      day: 3,
      time: "11:40 AM – 12:50 PM",
      title: "Hands-on Lab: GitHub Actions CI/CD & Production Vector Store",
      description:
        "Configure automated redeployments on push, connect hosted Firestore vector database in production, inspect Cloud Logging, and test revision rollback.",
      track: "lab",
      trackLabel: "Hands-on Lab",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Computer Labs",
      tags: ["GitHub Actions", "CI/CD", "Cloud Logging", "Rollback", "70 min"],
    },
    {
      id: "d3-s5",
      day: 3,
      time: "12:50 PM – 01:10 PM",
      title: "Day 3 Checkpoint: Live Public URLs Verification",
      description:
        "Live check of each attendee's public Cloud Run URL and /health endpoint. Preview Day 4 production audit.",
      track: "tech",
      trackLabel: "Checkpoint",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Seminar Hall",
      tags: ["Live URL", "Health Check", "Day 4 Preview", "20 min"],
    },

    // DAY 4
    {
      id: "d4-s1",
      day: 4,
      time: "10:00 AM – 10:30 AM",
      title: "Briefing: What AI Agents & Rapid Prototypes Miss",
      description:
        "Reviewing the 13-point audit checklist: secret leakage, prompt injection vulnerabilities, rate limits, token quotas, CORS headers, and error masking.",
      track: "keynote",
      trackLabel: "Security Briefing",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Seminar Hall",
      tags: ["Production Hardening", "Security", "Checklist", "30 min"],
    },
    {
      id: "d4-s2",
      day: 4,
      time: "10:30 AM – 11:30 AM",
      title: "Hands-on Audit: Checklist Execution & Refactoring",
      description:
        "Audit the agent-built app against the checklist, compare against the reviewed reference architecture, and patch security and reliability gaps.",
      track: "lab",
      trackLabel: "Hands-on Audit",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Computer Labs",
      tags: ["Audit", "Vulnerability Patching", "Refactoring", "60 min"],
    },
    {
      id: "d4-s3",
      day: 4,
      time: "11:30 AM – 11:40 AM",
      title: "Mid-Session Refreshment Break",
      description: "Quick break before final demo showcase.",
      track: "break",
      trackLabel: "Break",
      location: "Seminar Foyer",
      tags: ["Refreshments", "10 min"],
    },
    {
      id: "d4-s4",
      day: 4,
      time: "11:40 AM – 12:50 PM",
      title: "Project Showcase & Live Peer Demos",
      description:
        "Attendees demonstrate their live, cloud-deployed campus assistants answering from campus notes and executing tool commands.",
      track: "tech",
      trackLabel: "Live Showcase",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Seminar Hall & Labs",
      tags: ["Live Demos", "Showcase", "Peer Review", "70 min"],
    },
    {
      id: "d4-s5",
      day: 4,
      time: "12:50 PM – 01:20 PM",
      title: "Closing Ceremony & Certification for Working Deployments",
      description:
        "Official GDG on Campus VCET Certificates of Completion distributed for verified working deployments, plus flagship hackathon preview.",
      track: "keynote",
      trackLabel: "Ceremony & Awards",
      speaker: "TBD",
      speakerRole: "TBD",
      location: "Seminar Hall",
      tags: ["Certificates", "Awards", "Ceremony", "30 min"],
    },
  ],
  speakers: [],
  sponsors: [
    {
      id: "google-developer-groups",
      name: "Google Developer Groups",
      tier: "title",
      description:
        "Global community program providing student developers with official learning pathways, technology tools, and mentorship.",
      url: "https://developers.google.com/community/gdg",
      badge: "Global Community",
      perks: ["Official Badges", "Event Support", "Global Network"],
    },
    {
      id: "google-cloud",
      name: "Google Cloud",
      tier: "gold",
      description:
        "Supporting serverless Cloud Run infrastructure, developer tools, and Secret Manager access for attendee deployments.",
      url: "https://cloud.google.com",
      badge: "Cloud Infrastructure",
      perks: ["Cloud Run Runtime", "Developer Tools", "Cloud Logging"],
    },
    {
      id: "vcet-vasai",
      name: "VCET Vasai",
      tier: "platform",
      description:
        "Vidyavardhini's College of Engineering and Technology, hosting workshop venue, seminar halls, and high-speed computer labs.",
      url: "https://vcet.edu.in",
      badge: "Host Institution",
      perks: ["Computer Labs", "Seminar Hall", "High-Speed Network"],
    },
  ],
  registrationConfig: {
    isOpen: true,
    price: 0,
    currency: "INR",
    tracks: [
      {
        id: "all-days",
        name: "Full 4-Day Journey: Zero to Hero",
        description:
          "Complete hands-on experience spanning Web Foundation, AI Agents, Cloud Run, and Security Hardening.",
        badge: "FULL SERIES",
        icon: "terminal",
      },
      {
        id: "web-ai",
        name: "Web & AI Track (Days 1–2)",
        description:
          "Focus on fullstack application assembly, vector storage, and RAG agent development.",
        badge: "FRONTEND & AI",
        icon: "code",
      },
      {
        id: "cloud-devops",
        name: "Cloud & DevOps Track (Days 3–4)",
        description:
          "Focus on Docker, Google Cloud Run, Secret Manager, GitHub Actions, and production hardening.",
        badge: "CLOUD & DEVOPS",
        icon: "cloud",
      },
    ],
    departments: [
      "Computer Engg",
      "Information Tech",
      "AI & Data Science",
      "Electronics & Telecomm",
      "Civil / Mechanical",
      "Other Engineering",
    ],
    yearsOfStudy: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    experienceLevels: ["Beginner", "Intermediate", "Advanced"],
  },
};
