import { db } from "@/db";
import { sections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSectionById, getSectionBySlug, getStudents, parseId } from "@/lib/data";
import { DEFAULT_COLLEGE_LOGO, DEFAULT_LOGO } from "@/lib/defaults";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function resolveSection(raw: string) {
  const id = parseId(raw);
  if (id) return getSectionById(id);
  return getSectionBySlug(raw);
}

const EDITABLE = [
  "title", "description", "destination", "brandName", "badgeText", "pageTitle",
  "pageSubtitle", "subjectName", "facultyName", "sectionName", "footerText",
  "leftLogoUrl", "rightLogoUrl",
] as const;

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sec = await resolveSection(id);
  if (!sec) return Response.json({ error: "Section not found" }, { status: 404 });
  const roster = await getStudents(sec.id);
  return Response.json({ section: sec, students: roster });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sec = await resolveSection(id);
  if (!sec) return Response.json({ error: "Section not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.action === "restoreLogos") {
    const [row] = await db
      .update(sections)
      .set({ leftLogoUrl: DEFAULT_LOGO, rightLogoUrl: DEFAULT_COLLEGE_LOGO, updatedAt: new Date() })
      .where(eq(sections.id, sec.id))
      .returning();
    return Response.json(row);
  }

  const patch: Record<string, string | number | Date> = {};
  for (const key of EDITABLE) {
    if (typeof body[key] === "string") patch[key] = body[key] as string;
  }
  if (typeof body.sortOrder === "number") patch.sortOrder = body.sortOrder;
  patch.updatedAt = new Date();
  const [row] = await db.update(sections).set(patch).where(eq(sections.id, sec.id)).returning();
  return Response.json(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const sec = await resolveSection(id);
  if (!sec) return Response.json({ error: "Section not found" }, { status: 404 });
  await db.delete(sections).where(eq(sections.id, sec.id));
  return Response.json({ ok: true });
}
