import { evidence, db } from "$lib/server/db";
import path from "path";
import { json } from "@sveltejs/kit";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import type { RequestHandler } from './$types';


export const POST: RequestHandler = async ({ request, locals, url }) => {
  const user = locals.user;
  if (!user) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const formData = await request.formData();
  const file = formData.get("file");
  const caseId = formData.get("caseId")?.toString();
  const description = formData.get("description")?.toString() || "";
  
  if (!file || !(file instanceof File) || !caseId) {
    return json({ error: "Missing file or caseId" }, { status: 400 });
  }
  
  const id = randomUUID();
  const now = new Date();
  const ext = path.extname(file.name);
  const safeName = `${id}${ext}`;
  const uploadDir = path.resolve("static", "uploads", caseId);
  const filePath = path.join(uploadDir, safeName);
  
  await fs.mkdir(uploadDir, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));

  // Auto-tagging (simple: by file type)
  const tags = [ext.replace(".", ""), "uploaded", `case:${caseId}`];

  const newEvidence = {
    id,
    title: file.name,
    description,
    caseId,
    criminalId: null,
    evidenceType: ext.replace(".", "") || "document",
    fileUrl: `/uploads/${caseId}/${safeName}`,
    fileType: ext.replace(".", ""),
    fileSize: file.size,
    tags,
    uploadedBy: user.id,
    uploadedAt: now,
    updatedAt: now,
    fileName: file.name,
    summary: null,
    aiSummary: null,
  };
  
  await db.insert(evidence).values(newEvidence);
  return json(newEvidence, { status: 201 });
};