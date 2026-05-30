import { Router, Request, Response } from "express";
import { verifyJWT } from "../auth/auth.middleware";
import { retrieveChunks, generateAnswer } from "./rag.service";

const router = Router();

router.post("/query", verifyJWT, async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const workspaceId = req.user?.workspaceId ?? "";

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const relevantChunks = await retrieveChunks(query, workspaceId);
    res.write(
      `data: ${JSON.stringify({ type: "citations", chunks: relevantChunks })}\n\n`,
    );

    const stream = await generateAnswer(query, relevantChunks);
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (token) {
        res.write(
          `data: ${JSON.stringify({ type: "token", text: token })}\n\n`,
        );
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    res.write(
      `data: ${JSON.stringify({ type: "error", message: "Something went wrong" })}\n\n`,
    );
    res.end();
  }
});

export default router;
