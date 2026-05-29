import { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        workspaceId: string;
      };
    }
  }
}

export async function verifyJWT(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401));
  }
  const token = authHeader.split(" ")[1];
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(env.JWT_ACCESS_SECRET),
    );
    req.user = payload as { userId: string; role: string; workspaceId: string };
    next();
  } catch (err) {
    return next(new AppError("Unauthorized", 401));
  }
}
