export type UploadResult = { fileId: string; originalName: string };
export type Segment = { storyPath: string; index: number; originalText: string };
export type Replacement = { storyPath: string; index: number; translatedText: string };

export type BatchTranslateIn = { items: Array<{ text: string }>; mode?: "lipsum" | "reverse" };
export type BatchTranslateOut = { items: Array<{ translatedText: string }> };
