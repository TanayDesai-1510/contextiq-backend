import { db } from "../../db/client";
import { sources } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { ingestionQueue } from "../ingestion/ingestion.queue";
import { eq, and } from "drizzle-orm";

export async function createSource(
  workspaceId: string,
  owner: string,
  repo: string,
  branch: string = "main",
) {
  const [source] = await db
    .insert(sources)
    .values({
      workspaceId,
      type: "github",
      config: { owner, repo, branch },
    })
    .returning();
  await ingestionQueue.add("ingest-source", {
    sourceId: source.id,
    workspaceId,
    config: { owner, repo, branch },
  });
  return source;
}

export async function getSources(workspaceId: string) {
  const sourceList = await db.query.sources.findMany({
    where: eq(sources.workspaceId, workspaceId),
  });
  return sourceList;
}

export async function getSourceById(sourceId: string, workspaceId: string) {
  const source = await db.query.sources.findFirst({
    where: and(eq(sources.id, sourceId), eq(sources.workspaceId, workspaceId)),
  });
  if (!source) {
    throw new AppError("Source not found", 404);
  }
  return source;
}
