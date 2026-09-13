import { db } from "@/db";
import { sections } from "@/db/schema";
import { asc } from "drizzle-orm";
import { createSectionWithDemo, ensureSections } from "@/lib/data";
import { buildSectionDefaults, slugify } from "@/lib/defaults";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await ensureSections();
  return Response.json(rows);
}

/**
 * Add a new section. If no name is supplied, a demo section with a unique
 * name and demo students is created automatically.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const existing = await db.select().from(sections).orderBy(asc(sections.sortOrder));
  const usedSlugs = new Set(existing.map((s) => s.slug));

  let name = (body.name ?? "").trim();
  if (!name) {
    let n = existing.length + 1;
    while (usedSlugs.has(slugify(`new-${n}`))) n++;
    name = `New ${n}`;
  }
  let base = slugify(name) || "section";
  let slug = base;
  let i = 2;
  while (usedSlugs.has(slug)) slug = `${base}-${i++}`;
  base = slug;

  const maxOrder = existing.reduce((m, s) => Math.max(m, s.sortOrder), 0);
  const defaults = buildSectionDefaults(slug, name, maxOrder + 1);
  const created = await createSectionWithDemo(defaults, existing.length + 5);
  return Response.json(created, { status: 201 });
}
