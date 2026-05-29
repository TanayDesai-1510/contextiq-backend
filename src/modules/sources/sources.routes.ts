import { Router } from "express";
import { verifyJWT } from "../auth/auth.middleware";
import { createSource, getSources, getSourceById } from "./sources.service";

const router = Router();

router.post("/", verifyJWT, async (req, res, next) => {
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
});

router.get("/", verifyJWT, async (req, res, next) => {
  try {
    const sources = await getSources(req.user?.workspaceId ?? "");
    res.status(200).json(sources);
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

export default router;
