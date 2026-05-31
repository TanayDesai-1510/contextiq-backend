import { Router, Request, Response } from "express";
import { verifyJWT } from "../auth/auth.middleware";
import { retrieveChunks, generateAnswer } from "./rag.service";
import { querySchema } from "./rag.validation";
import { validate } from "../../lib/validate";
import { db } from "../../db/client";
import { queries } from "../../db/schema";
import { checkSemanticCache, setSemanticCache } from "./rag.cache";
import { openai } from "../../lib/openai";

const router = Router();

router.post(
  "/query",
  verifyJWT,
  validate(querySchema),
  async (req: Request, res: Response) => {
    try {
      const { query, history = [] } = req.body;
      const workspaceId = req.user?.workspaceId ?? "";

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // 1. Embed the query once
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      // 2. Check semantic cache
      const cached = await checkSemanticCache(queryEmbedding, workspaceId);
      if (cached) {
        res.write(`data: ${JSON.stringify({ type: "citations", chunks: cached.citations })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "token", text: cached.answer })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done", cacheHit: true })}\n\n`);
        res.end();
        setImmediate(async () => {
          await db.insert(queries).values({
            workspaceId,
            userId: req.user?.userId,
            queryText: query,
            cacheHit: "semantic",
          });
        });
        return;
      }

      // 3. Cache miss — run full RAG pipeline
      const relevantChunks = await retrieveChunks(queryEmbedding, workspaceId);
      res.write(`data: ${JSON.stringify({ type: "citations", chunks: relevantChunks })}\n\n`);

      // 4. Stream GPT-4o response and collect full answer
      const stream = await generateAnswer(query, relevantChunks, history);
      let fullAnswer = "";
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? "";
        fullAnswer += token;
        if (token) {
          res.write(`data: ${JSON.stringify({ type: "token", text: token })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();

      // 5. Store in cache and log query async
      setImmediate(async () => {
        try {
          await setSemanticCache(queryEmbedding, workspaceId, fullAnswer, relevantChunks);
          await db.insert(queries).values({
            workspaceId,
            userId: req.user?.userId,
            queryText: query,
            cacheHit: "miss",
          });
        } catch (err) {
          console.error("Failed to log query:", err);
        }
      });
    } catch (err) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "Something went wrong" })}\n\n`);
      res.end();
    }
  },
);

export default router;