import { env } from "./config/env";
import express from "express";
import { errorHandler } from "./lib/errors";
import cors from "cors";
import helmet from "helmet";
import authRouter from "./modules/auth/auth.routes";
import sourcesRouter from "./modules/sources/sources.routes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// routes
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/sources", sourcesRouter);

app.use(errorHandler);
app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});
