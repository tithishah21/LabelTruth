import type { Request, Response, NextFunction } from "express";
import { extractTokenFromHeader, verifyToken, type TokenPayload } from "./auth";

/**
 * Extend Express Request to include authenticated user data
 */
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware: Extract and verify JWT from Authorization header
 * Sets req.user if token is valid, continues to next middleware regardless
 * (allows mixed authenticated/guest endpoints)
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}

/**
 * Middleware: Require valid JWT token
 * Responds with 401 if token is missing or invalid
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized. Please log in." });
    return;
  }
  next();
}
