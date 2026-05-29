import { Router } from "express";
import { register, login } from "./auth.service";

const router = Router();

router.post("/register", async (req, res, next) => {
  const { email, password, workspaceName } = req.body;
  try {
    const user = await register(email, password, workspaceName);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await login(email, password);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
