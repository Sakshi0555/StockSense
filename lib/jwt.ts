import { SignJWT, jwtVerify } from "jose";

// Kept free of next/headers so middleware can import it.
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "stocksense-dev-secret");

export const SESSION_COOKIE = "stocksense_session";

export async function signToken(userId: number) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string | undefined): Promise<{ userId: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.userId === "number" ? { userId: payload.userId } : null;
  } catch {
    return null;
  }
}
