import { db } from "../../db/client";
import { users, workspaces } from "../../db/schema";
import bcrypt from "bcryptjs";
import { AppError } from "../../lib/errors";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../../config/env";


export async function register(
  email: string,
  password: string,
  workspaceName: string,
) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    throw new AppError("User already exists", 409);
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: workspaceName,
    })
    .returning();

  const [user] = await db
    .insert(users)
    .values({
      role: "admin",
      email,
      hashedPassword,
      workspaceId: workspace.id,
    })
    .returning();
  const { hashedPassword: _, ...safeUser } = user;
  return safeUser;
}

export async function login(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }
  const isMatch = await bcrypt.compare(password, user.hashedPassword);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }
  const { hashedPassword: _, ...safeUser } = user;
  const tokens = await generateTokens(user.id, user.role, user.workspaceId ?? '');
  return { user: safeUser, ...tokens };
}

export async function generateTokens(
  userId: string,
  role: string,
  workspaceId: string,
) {
  const accessToken = await new SignJWT({ userId, role, workspaceId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(new TextEncoder().encode(env.JWT_ACCESS_SECRET));
  const refreshToken = await new SignJWT({ userId, role, workspaceId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
    .sign(new TextEncoder().encode(env.JWT_REFRESH_SECRET));
  return { accessToken, refreshToken };
}
