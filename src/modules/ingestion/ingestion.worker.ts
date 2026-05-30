import { chunks, documents, sources } from "../../db/schema";
import { Worker } from "bullmq";
import { Octokit } from "@octokit/rest";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { db } from "../../db/client";
import { eq } from "drizzle-orm";
import { openai } from "../../lib/openai";
import { env } from "../../config/env";

export const ingestionWorker = new Worker(
  "ingest-source",
  async (job) => {
    const { sourceId, workspaceId, config } = job.data;
    console.log('🔄 Job started for source:', sourceId)
    try {
      await db
        .update(sources)
        .set({ status: "running" })
        .where(eq(sources.id, sourceId));
        console.log('✅ Status set to running')
      const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
      const { data: tree } = await octokit.rest.git.getTree({
        owner: config.owner,
        repo: config.repo,
        tree_sha: config.branch,
        recursive: "1",
      });
      const mdFiles = tree.tree.filter(
        (file: any) => file.path?.toLowerCase() === 'readme.md' && file.type === "blob",
      );
      console.log(`📁 Found ${mdFiles.length} markdown files`)
      for (const file of mdFiles) {
        const { data: blob } = await octokit.rest.git.getBlob({
          owner: config.owner,
          repo: config.repo,
          file_sha: file.sha,
        });
        const content = Buffer.from(blob.content, "base64").toString("utf-8");
        const [doc] = await db
          .insert(documents)
          .values({
            sourceId,
            workspaceId,
            title: file.path!,
            url: `https://github.com/${config.owner}/${config.repo}/blob/${config.branch}/${file.path}`,
          })
          .returning();
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 500,
          chunkOverlap: 50,
        });
        const chunkTexts = await splitter.splitText(content);
        console.log(`📝 Chunked ${file.path} into ${chunkTexts.length} chunks`)
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
      }
      await db
        .update(sources)
        .set({ status: "done", lastSyncedAt: new Date() })
        .where(eq(sources.id, sourceId));
    } catch (err) {
      await db
        .update(sources)
        .set({ status: "error" })
        .where(eq(sources.id, sourceId));
        throw err;
    }
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379,
    },
    settings: {
        backoffStrategy: () => 0,
    },
  },
);
ingestionWorker.on('completed', (job) => {
  console.log('✅ Job completed:', job.id)
})

ingestionWorker.on('failed', (job, err) => {
  console.error('❌ Job failed:', job?.id, err.message)
})