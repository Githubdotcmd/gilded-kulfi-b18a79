import { db } from "@/db";
import { landingSettings, sections, students } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import {
  DEFAULT_LANDING,
  DEFAULT_SECTIONS,
  buildDemoStudents,
  type SectionDefaults,
} from "./defaults";

export async function ensureLanding() {
  const [row] = await db.select().from(landingSettings).where(eq(landingSettings.id, 1));
  if (row) return row;
  const [created] = await db.insert(landingSettings).values(DEFAULT_LANDING).returning();
  return created;
}

export async function ensureSections() {
  const existing = await db.select().from(sections).orderBy(asc(sections.sortOrder), asc(sections.id));
  if (existing.length > 0) return existing;
  const created = [];
  for (let i = 0; i < DEFAULT_SECTIONS.length; i++) {
    created.push(await createSectionWithDemo(DEFAULT_SECTIONS[i], i + 1));
  }
  return created;
}

export async function createSectionWithDemo(defaults: SectionDefaults, seed: number) {
  const [sec] = await db.insert(sections).values(defaults).returning();
  const demo = buildDemoStudents(seed, 20);
  await db.insert(students).values(demo.map((d) => ({ ...d, sectionId: sec.id })));
  return sec;
}

export async function getSectionBySlug(slug: string) {
  const [sec] = await db.select().from(sections).where(eq(sections.slug, slug));
  return sec ?? null;
}

export async function getSectionById(id: number) {
  const [sec] = await db.select().from(sections).where(eq(sections.id, id));
  return sec ?? null;
}

export async function getStudents(sectionId: number) {
  return db
    .select()
    .from(students)
    .where(eq(students.sectionId, sectionId))
    .orderBy(asc(students.serial), asc(students.id));
}

export async function touchSection(id: number) {
  await db.update(sections).set({ updatedAt: new Date() }).where(eq(sections.id, id));
}

export function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
