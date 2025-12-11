export async function mockTranslate(
  text: string,
  mode: "lipsum" | "reverse" = "lipsum"
) {
  // symulacja opóźnienia zewnętrznego providera
  await new Promise((r) => setTimeout(r, 300));
  return mode === "reverse"
    ? text.split("").reverse().join("")
    : `Lorem Ipsum [Translated]: ${text}`;
}

/** Batch do /translate/batch — spójny z mockTranslate */
export async function mockTranslateBatch(
  items: Array<{ text: string }>,
  mode: "lipsum" | "reverse" = "lipsum"
) {
  await new Promise((r) => setTimeout(r, 300));
  return items.map(({ text }) => ({
    translatedText:
      mode === "reverse"
        ? text.split("").reverse().join("")
        : `Lorem Ipsum [Translated]: ${text}`,
  }));
}
