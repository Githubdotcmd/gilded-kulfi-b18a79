export const DEFAULT_LOGO = "/images/eit-logo.png";
export const DEFAULT_PERSONAL_IMAGE = "/images/teacher.jpg";
export const DEFAULT_COLLEGE_LOGO = "/images/college-logo.png";

export const DEFAULT_LANDING = {
  id: 1,
  brandName: "Programming Fundamentals",
  badgeText: "STUDENT PORTAL",
  mainTitle: "Programming Fundamentals",
  subtitle: "Select your section below to open your student directory.",
  subjectLabel: "Subject",
  subjectValue: "Programming Fundamentals",
  facultyLabel: "Faculty",
  facultyValue: "EIT",
  portalLabel: "Academic Portal",
  portalValue: "Student Directory",
  chooseTitle: "Choose Your Section",
  chooseSubtitle: "Open the required group. Each section runs as its own page.",
  footerText: "© EIT • Programming Fundamentals • Student Directory",
  logoUrl: DEFAULT_LOGO,
  personalImageUrl: DEFAULT_PERSONAL_IMAGE,
};

export type SectionDefaults = {
  slug: string;
  title: string;
  description: string;
  destination: string;
  sortOrder: number;
  brandName: string;
  badgeText: string;
  pageTitle: string;
  pageSubtitle: string;
  subjectName: string;
  facultyName: string;
  sectionName: string;
  footerText: string;
  leftLogoUrl: string;
  rightLogoUrl: string;
};

export function buildSectionDefaults(
  slug: string,
  sectionName: string,
  sortOrder: number,
): SectionDefaults {
  return {
    slug,
    title: `Section ${sectionName}`,
    description: `Open the Section ${sectionName} student directory.`,
    destination: `/section/${slug}`,
    sortOrder,
    brandName: "EIT • Student Directory",
    badgeText: "ACADEMIC STUDENT DIRECTORY",
    pageTitle: "Programming Fundamentals",
    pageSubtitle: "Student details and academic directory",
    subjectName: "Programming Fundamentals",
    facultyName: "EIT",
    sectionName,
    footerText: `© EIT • Programming Fundamentals • Section ${sectionName}`,
    leftLogoUrl: DEFAULT_LOGO,
    rightLogoUrl: DEFAULT_COLLEGE_LOGO,
  };
}

export const DEFAULT_SECTIONS: SectionDefaults[] = [
  buildSectionDefaults("1a", "1A", 1),
  buildSectionDefaults("1b", "1B", 2),
  buildSectionDefaults("1c", "1C", 3),
  buildSectionDefaults("a2b2", "A2B2", 4),
];

const FIRST_NAMES = [
  "Lakshansh", "Rashi", "Nitesh", "Sagar", "Ankita", "Bhumika", "Radhika",
  "Tushar", "Payal", "Dev", "Aarav", "Priya", "Rohan", "Sneha", "Vikas",
  "Kavya", "Aman", "Ishita", "Harsh", "Neha", "Yash", "Pooja", "Aditya",
  "Muskan", "Rahul", "Simran", "Kunal", "Divya", "Manish", "Riya",
];
const LAST_NAMES = [
  "Yadav", "Thakur", "Mandal", "Singh", "Jain", "Parekh", "Kalo", "Sahu",
  "Kumar", "Sharma", "Verma", "Gupta", "Patel", "Mishra", "Dewangan",
  "Sinha", "Chandrakar", "Tiwari", "Agrawal", "Sao",
];

export type DemoStudent = { serial: number; name: string; ruid: string; email: string };

/** Deterministic demo roster so each section starts with realistic data. */
export function buildDemoStudents(seed: number, count = 20): DemoStudent[] {
  const out: DemoStudent[] = [];
  for (let i = 0; i < count; i++) {
    const fn = FIRST_NAMES[(i * 7 + seed * 3) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 5 + seed * 11) % LAST_NAMES.length];
    const idNum = 1000 * seed + i * 17 + 61;
    out.push({
      serial: i + 1,
      name: `${fn} ${ln}`,
      ruid: `RU-26-${String(idNum).padStart(5, "0")}`,
      email: `${fn}.${ln}`.toLowerCase().replace(/\s+/g, "") + "@rungta.org",
    });
  }
  return out;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
