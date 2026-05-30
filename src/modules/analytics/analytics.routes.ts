import { Router } from "express";
import { verifyJWT } from "../auth/auth.middleware";
import {
  getQueryStats,
  getCacheStats,
  getKnowledgeGaps,
} from "./analytics.service";

const router = Router();

router.get("/stats", verifyJWT, async (req, res, next) => {
  try {
    const stats = await getQueryStats(req.user?.workspaceId ?? "");
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
});

router.get("/cache", verifyJWT, async (req, res, next) => {
  try {
    const cache = await getCacheStats(req.user?.workspaceId ?? "");
    res.status(200).json(cache);
  } catch (err) {
    next(err);
  }
});

router.get("/gaps", verifyJWT, async (req, res, next) => {
  try {
    const gaps = await getKnowledgeGaps(req.user?.workspaceId ?? "");
    res.status(200).json(gaps);
  } catch (err) {
    next(err);
  }
});

export default router