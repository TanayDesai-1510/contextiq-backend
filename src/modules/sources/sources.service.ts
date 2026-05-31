import { db } from "../../db/client";
import { documents, sources, chunks } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { ingestionQueue } from "../ingestion/ingestion.queue";
import { eq, and } from "drizzle-orm";
import { extractTextFromPDF } from "./connectors/pdf.connector";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { openai } from "../../lib/openai";
import { extractTextFromURL } from "./connectors/url.connector";

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

export async function createPDFSource(
  workspaceId: string,
  fileBuffer: Buffer,
  fileName: string,
) {
  const text = await extractTextFromPDF(fileBuffer);
  const [source] = await db
    .insert(sources)
    .values({
      workspaceId,
      type: "pdf",
      config: { fileName },
      status: "running",
    })
    .returning();
  const [doc] = await db
    .insert(documents)
    .values({
      sourceId: source.id,
      workspaceId,
      title: fileName,
      url: null,
    })
    .returning();
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  const chunkTexts = await splitter.splitText(text);
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunkTexts,
  });
  for (let i = 0; i < chunkTexts.length; i++) {
    await db.insert(chunks).values({
      documentId: doc.id,
      workspaceId,
      content: chunkTexts[i],
      embedding: embeddingResponse.data[i].embedding,
      tokenCount: chunkTexts[i].split(" ").length,
    });
  }
  await db
    .update(sources)
    .set({ status: "done", lastSyncedAt: new Date() })
    .where(eq(sources.id, source.id));
  return source;
}

export async function createURLSource(workspaceId: string, url: string) {
  const { text, title } = await extractTextFromURL(url);
  if (!text || text.length < 100) {
    throw new AppError("Could not extract enough text from this URL", 400);
  }

  const [source] = await db
    .insert(sources)
    .values({
      workspaceId,
      type: "url",
      config: { url },
      status: "running",
    })
    .returning();

  const [doc] = await db
    .insert(documents)
    .values({
      sourceId: source.id,
      workspaceId,
      title,
      url,
    })
    .returning();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  const chunkTexts = await splitter.splitText(text);

  if (chunkTexts.length === 0) {
    await db
      .update(sources)
      .set({ status: "error" })
      .where(eq(sources.id, source.id));
    throw new AppError(
      "Could not extract text from this URL. The page may be blocked or empty.",
      400,
    );
  }

  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunkTexts,
  });

  for (let i = 0; i < chunkTexts.length; i++) {
    await db.insert(chunks).values({
      documentId: doc.id,
      workspaceId,
      content: chunkTexts[i],
      embedding: embeddingResponse.data[i].embedding,
      tokenCount: chunkTexts[i].split(" ").length,
    });
  }

  await db
    .update(sources)
    .set({ status: "done", lastSyncedAt: new Date() })
    .where(eq(sources.id, source.id));

  return source;
}
