export async function mockTranslate(
  text: string,
  mode: "lipsum" | "reverse" = "lipsum"
) {
  // symulacja opóźnienia zewnętrznego providera
  await new Promise((r) => setTimeout(r, 300));

  if (mode === "reverse") {
    return text.split("").reverse().join("");
  }
  return `${text} [Translated]`;
}

/** Batch do /translate/batch — spójny z mockTranslate */
export async function mockTranslateBatch(
  items: Array<{ text: string }>,
  mode: "lipsum" | "reverse" = "lipsum"
) {
  await new Promise((r) => setTimeout(r, 300));
  if (mode === "reverse") {
    return items.map(({ text }) => ({
      translatedText: text.split("").reverse().join(""),
    }));
  }
  return items.map(({ text }) => ({
    translatedText: `${text} [Translated]`,
  }));
}
