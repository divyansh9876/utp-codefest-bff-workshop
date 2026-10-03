export const PHASES = [
  {
    id: "architecture",
    n: 1,
    title: "Architecture & DB",
    minutes: 30,
    file: "application.yml · HealthController",
  },
  {
    id: "crud",
    n: 2,
    title: "CRUD Playground",
    minutes: 45,
    file: "Project · ProjectController",
  },
  {
    id: "auth",
    n: 3,
    title: "Auth & JWT Vault",
    minutes: 30,
    file: "JwtService · AuthController",
  },
  {
    id: "deploy",
    n: 4,
    title: "Deploy & Security",
    minutes: 15,
    file: "Dockerfile · env · Render",
  },
];

export const TOTAL_MINUTES = PHASES.reduce((sum, p) => sum + p.minutes, 0);

export const CATEGORIES = [
  "AI / ML",
  "Web",
  "Mobile",
  "FinTech",
  "Sustainability",
  "HealthTech",
  "EdTech",
  "IoT",
  "Gaming",
  "Other",
];

export const CATEGORY_COLORS = {
  "AI / ML": "violet",
  Web: "blue",
  Mobile: "cyan",
  FinTech: "green",
  Sustainability: "lime",
  HealthTech: "rose",
  EdTech: "amber",
  IoT: "teal",
  Gaming: "pink",
  Other: "slate",
};

export const SAMPLE_PROJECTS = [
  {
    title: "CampusEats",
    description:
      "Pre-order food from UTP cafeterias and skip the lunch queue. Real-time order status and pickup QR codes.",
    category: "Web",
    teamName: "Village 5 Devs",
    repoUrl: "https://github.com/example/campuseats",
  },
  {
    title: "GreenLoop",
    description:
      "Gamified recycling tracker: scan bins around campus, earn points, and see your residential village climb the leaderboard.",
    category: "Sustainability",
    teamName: "Team Photosynthesis",
    repoUrl: "https://github.com/example/greenloop",
  },
  {
    title: "LectureLens",
    description:
      "Upload lecture slides and get AI-generated flashcards and quiz questions before your finals.",
    category: "AI / ML",
    teamName: "Null Pointers",
    repoUrl: "https://github.com/example/lecturelens",
  },
  {
    title: "SplitRM",
    description:
      "Split bills with housemates in Ringgit, track who owes what, and settle up with DuitNow QR.",
    category: "FinTech",
    teamName: "Ringgit Rangers",
    repoUrl: "https://github.com/example/splitrm",
  },
  {
    title: "LabSense",
    description:
      "ESP32 sensors that report lab temperature and humidity to a live dashboard and alert technicians.",
    category: "IoT",
    teamName: "Hardware Hackers",
    repoUrl: "https://github.com/example/labsense",
  },
];

export const STORAGE_KEYS = {
  token: "bff:token",
  user: "bff:user",
  timer: "bff:timer",
  steps: "bff:steps",
  checklist: "bff:checklist",
  platform: "bff:platform",
  prodUrl: "bff:prod-url",
};
