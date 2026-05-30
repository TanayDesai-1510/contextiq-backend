import { db } from "../../db/client";
import { openai } from "../../lib/openai";
import { sql, eq } from "drizzle-orm";

export async function retrieveChunks(query: string, workspaceId: string) {
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  const result = await db.execute(sql`
  SELECT id, content, heading_path, document_id,
    1 - (embedding <=> ${sql.raw(`'[${queryEmbedding.join(",")}]'::vector`)}) AS similarity
  FROM chunks
  WHERE workspace_id = ${workspaceId}
  ORDER BY embedding <=> ${sql.raw(`'[${queryEmbedding.join(",")}]'::vector`)}
  LIMIT 5
`);
  return result.rows;
}

export async function generateAnswer(query: string, relevantChunks: any[]) {
  const context = relevantChunks
    .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
    .join("\n\n");
  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    stream: true,
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant. Answer questions based only on the provided context. 
                Always cite sources using [1], [2] etc. If the answer is not in the context, say so.`,
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${query}`,
      },
    ],
  });
  return stream;
}
