import { RequestHandler } from "express";
import { mockTranslate, mockTranslateBatch } from "@/services/translate.service";
import { TranslateBody, TranslateBatchBody } from "@/schemas/translate.schema";

export const translateOne: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as TranslateBody;
    const translatedText = await mockTranslate(body.text, body.mode);
    res.json({ translatedText });
  } catch (e) {
    next(e);
  }
};

export const translateBatch: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as TranslateBatchBody;
    const items = await mockTranslateBatch(body.items, body.mode);
    res.json({ items });
  } catch (e) {
    next(e);
  }
};
