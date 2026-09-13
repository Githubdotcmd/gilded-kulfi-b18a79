import { db } from "@/db";
import { students } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getStudents, parseId, touchSection } from "@/lib/data";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; studentId: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const p = await ctx.params;
  const id = parseId(p.id);
  const sid = parseId(p.studentId);
  if (!id || !sid) return Response.json({ error: "Invalid id" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, string> = {};
  for (const k of ["name", "ruid", "email"] as const) {
    if (typeof body[k] === "string") patch[k] = (body[k] as string).trim();
  }
  if (patch.name !== undefined && !patch.name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  const [row] = await db
    .update(students)
    .set(patch)
    .where(and(eq(students.id, sid), eq(students.sectionId, id)))
    .returning();
  if (!row) return Response.json({ error: "Student not found" }, { status: 404 });
  await touchSection(id);
  return Response.json(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const p = await ctx.params;
  const id = parseId(p.id);
  const sid = parseId(p.studentId);
  if (!id || !sid) return Response.json({ error: "Invalid id" }, { status: 400 });
  await db.delete(students).where(and(eq(students.id, sid), eq(students.sectionId, id)));
  // Re-number serials so the list stays continuous.
  const remaining = await getStudents(id);
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].serial !== i + 1) {
      await db.update(students).set({ serial: i + 1 }).where(eq(students.id, remaining[i].id));
    }
  }
  await touchSection(id);
  return Response.json({ ok: true });
}
