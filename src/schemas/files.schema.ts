import { z } from "zod";

export const exportBodySchema = z.object({
  replacements: z
    .array(
      z.object({
        storyPath: z.string().min(1),
        index: z.number().int().nonnegative(),
        translatedText: z.string(),
      })
    )
    .min(1, "No replacements"),
});

export type ExportBody = z.infer<typeof exportBodySchema>;
