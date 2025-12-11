import type { ZodType, ZodError } from "zod";
import type { RequestHandler } from "express";

/**
 * Middleware walidacji Zod (async-safe)
 * Zwraca 422 + szczegóły przy błędzie walidacji
 */
export const validate =
  <T extends ZodType<any, any, any>>(schema: T, pick: "body" | "query" | "params" = "body"): RequestHandler =>
  async (req, _res, next) => {
    try {
      const data = (req as any)[pick];
      const parsed = await schema.parseAsync(data);
      (req as any)[pick] = parsed;
      next();
    } catch (err) {
      if ((err as any)?.name === "ZodError") {
        const ze = err as ZodError;
        const details = ze.issues.map(i => ({
          path: i.path.join("."),
          code: i.code,
          message: i.message,
        }));
        return next(Object.assign(new Error("Validation error"), { status: 422, details }));
      }
      next(err);
    }
  };
