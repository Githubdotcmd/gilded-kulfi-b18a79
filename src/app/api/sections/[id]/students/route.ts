import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSectionById, getStudents, parseId, touchSection } from "@/lib/data";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type IncomingStudent = { name?: string; ruid?: string; email?: string; serial?: number };

function clean(s: IncomingStudent) {
  return {
    name: String(s.name ?? "").trim(),
    ruid: String(s.ruid ?? "").trim(),
    email: String(s.email ?? "").trim(),
  };
}

export async function GET(_req: Request, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return Response.json({ error: "Invalid id" }, { status: 400 });
  return Response.json(await getStudents(id));
}

/**
 * POST { student } → add one student
 * POST { students: [], mode: "replace" | "append" } → bulk upload
 */
export async function POST(req: Request, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return Response.json({ error: "Invalid id" }, { status: 400 });
  const sec = await getSectionById(id);
  if (!sec) return Response.json({ error: "Section not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    student?: IncomingStudent;
    students?: IncomingStudent[];
    mode?: "replace" | "append";
  };

  if (Array.isArray(body.students)) {
    const rows = body.students.map(clean).filter((s) => s.name);
    if (body.mode !== "append") {
      await db.delete(students).where(eq(students.sectionId, id));
    }
    const existing = body.mode === "append" ? await getStudents(id) : [];
    let serial = existing.reduce((m, s) => Math.max(m, s.serial), 0);
    if (rows.length > 0) {
      await db.insert(students).values(
        rows.map((r) => ({ ...r, sectionId: id, serial: ++serial })),
      );
    }
    await touchSection(id);
    return Response.json({ ok: true, count: rows.length, students: await getStudents(id) });
  }

  const s = clean(body.student ?? {});
  if (!s.name) return Response.json({ error: "Name is required" }, { status: 400 });
  const existing = await getStudents(id);
  const serial = existing.reduce((m, x) => Math.max(m, x.serial), 0) + 1;
  const [created] = await db
    .insert(students)
    .values({ ...s, sectionId: id, serial })
    .returning();
  await touchSection(id);
  return Response.json(created, { status: 201 });
}

/** Delete all students in the section. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return Response.json({ error: "Invalid id" }, { status: 400 });
  await db.delete(students).where(eq(students.sectionId, id));
  await touchSection(id);
  return Response.json({ ok: true });
}
