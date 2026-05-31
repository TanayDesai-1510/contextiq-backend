import { env } from "./config/env";
import express from "express";
import { errorHandler } from "./lib/errors";
import cors from "cors";
import helmet from "helmet";
import authRouter from "./modules/auth/auth.routes";
import sourcesRouter from "./modules/sources/sources.routes";
import './modules/ingestion/ingestion.worker'
import ragRouter from "./modules/rag/rag.routes";
import { apiLimiter, authLimiter } from "./lib/rateLimiter";
import analyticsRouter from './modules/analytics/analytics.routes'

const app = express();
app.set('trust proxy', 1)

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(apiLimiter)

// routes
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authLimiter, authRouter);
app.use("/sources", sourcesRouter);
app.use("/rag", ragRouter);
app.use("/analytics", analyticsRouter)

app.use(errorHandler);
app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});
