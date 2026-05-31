import { Router } from "express";
import { verifyJWT } from "../auth/auth.middleware";
import {
  createSource,
  getSources,
  getSourceById,
  createPDFSource,
  createURLSource,
} from "./sources.service";
import { validate } from "../../lib/validate";
import { upload } from "../../lib/upload";
import { createSourceSchema } from "./sources.validation";
import { db } from "../../db/client";
import { sources as sourcesTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { ingestionQueue } from "../ingestion/ingestion.queue";

const router = Router();

router.post(
  "/",
  verifyJWT,
  validate(createSourceSchema),
  async (req, res, next) => {
    const { owner, repo, branch } = req.body;
    try {
      const source = await createSource(
        req.user?.workspaceId ?? "",
        owner,
        repo,
        branch,
      );
      res.status(201).json(source);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/", verifyJWT, async (req, res, next) => {
  try {
    const sources = await getSources(req.user?.workspaceId ?? "");
    res.status(200).json(sources);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/upload",
  verifyJWT,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file upload" });
      }
      const source = await createPDFSource(
        req.user?.workspaceId ?? "",
        req.file.buffer,
        req.file.originalname,
      );
      res.status(201).json(source);
    } catch (err) {
      next(err);
    }
  },
);

router.post("/scrape", verifyJWT, async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    const source = await createURLSource(req.user?.workspaceId ?? "", url);
    res.status(201).json(source);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", verifyJWT, async (req, res, next) => {
  try {
    const sourceById = await getSourceById(
      req.params.id as string,
      req.user?.workspaceId ?? "",
    );
    res.status(200).json(sourceById);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/resync", verifyJWT, async (req, res, next) => {
  try {
    const sourceId = req.params.id as string;
    const workspaceId = req.user?.workspaceId ?? "";
    const source = await getSourceById(sourceId, workspaceId);

    await db
      .update(sourcesTable)
      .set({ status: "idle" })
      .where(eq(sourcesTable.id, sourceId));

    if (source.type === "github") {
      await ingestionQueue.add("ingest-source", {
        sourceId: source.id,
        workspaceId,
        config: source.config,
      });
      res.status(200).json({ message: "Re-sync started" });
    } else if (source.type === "url") {
      const config = source.config as { url: string };
      await createURLSource(workspaceId, config.url);
      res.status(200).json({ message: "Re-sync complete" });
    } else {
      res.status(400).json({ error: "This source type cannot be re-synced" });
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", verifyJWT, async (req, res, next) => {
  try {
    const sourceId = req.params.id as string;
    const workspaceId = req.user?.workspaceId ?? "";
    await getSourceById(sourceId, workspaceId);
    await db.delete(sourcesTable).where(eq(sourcesTable.id, sourceId));
    res.status(200).json({ message: "Source deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
