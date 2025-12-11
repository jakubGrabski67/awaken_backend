import { z } from "zod";

export const translateBodySchema = z.object({
  text: z.string().min(1),
  mode: z.enum(["lipsum", "reverse"]).optional().default("lipsum"),
});
export type TranslateBody = z.infer<typeof translateBodySchema>;

export const translateBatchBodySchema = z.object({
  items: z.array(z.object({ text: z.string() })).min(1),
  mode: z.enum(["lipsum", "reverse"]).optional().default("lipsum"),
});
export type TranslateBatchBody = z.infer<typeof translateBatchBodySchema>;
