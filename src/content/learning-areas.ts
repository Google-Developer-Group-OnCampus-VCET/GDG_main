export interface LearningArea {
  id: string;
  title: string;
  description: string;
}

export const learningAreas: LearningArea[] = [
  {
    id: "web",
    title: "Web",
    description: "Modern web development — frameworks, performance, and accessible interfaces.",
  },
  {
    id: "ai-ml",
    title: "AI / ML",
    description: "Machine learning fundamentals and applied projects using today's tools.",
  },
  {
    id: "cloud",
    title: "Cloud",
    description: "Cloud infrastructure, deployment, and building services that scale.",
  },
  {
    id: "android",
    title: "Android",
    description: "Native and cross-platform mobile development for Android.",
  },
];
