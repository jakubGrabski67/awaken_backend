import { describe, it, expect } from "vitest";
import { listSegments, replaceSegments } from "../src/services/idml.service.js";
import { makeIdml } from "./helpers/idmlBuilder";
import AdmZip from "adm-zip";

describe("idml.service", () => {
  it("tylko NIEpuste Content i zachowuje kolejność stories", () => {
    const buf = makeIdml([
      { name: "Story_2", contents: ["B1", " ", "", "B2"] },
      { name: "Story_1", contents: ["A1", null, "A2"] },
    ]);
    const segs = listSegments(buf);
    expect(segs.map((s) => [s.storyPath, s.index, s.originalText])).toEqual([
      ["Stories/Story_1.xml", 0, "A1"],
      ["Stories/Story_1.xml", 1, "A2"],
      ["Stories/Story_2.xml", 0, "B1"],
      ["Stories/Story_2.xml", 1, "B2"],
    ]);
  });

  it("replaceSegments + ponowny listSegments odczytuje zmienione treści", () => {
    const buf = makeIdml([{ name: "Story_1", contents: ["Hello", "World"] }]);
    const segs = listSegments(buf);
    expect(segs.length).toBe(2);

    const out = replaceSegments(buf, [
      { storyPath: "Stories/Story_1.xml", index: 0, translatedText: "Witaj" },
      { storyPath: "Stories/Story_1.xml", index: 1, translatedText: "Świecie" },
    ]);

    const segs2 = listSegments(out);
    expect(segs2.map((s) => s.originalText)).toEqual(["Witaj", "Świecie"]);

    const zip = new AdmZip(out);
    expect(zip.getEntries().some((e) => e.entryName === "designmap.xml")).toBe(
      true
    );
  });

  it("ignoruje replacementy spoza zakresu", () => {
    const buf = makeIdml([{ name: "Story_1", contents: ["A"] }]);

    expect(() =>
      replaceSegments(buf, [
        { storyPath: "Stories/Story_1.xml", index: 5, translatedText: "X" },
      ])
    ).toThrow();
  });

  it("err 422 dla uszkodzonego ZIP-a", () => {
    const broken = Buffer.from("not-a-zip");
    expect(() => listSegments(broken)).toThrow();
  });

  it("err 422 dla ZIP bez designmap.xml / Stories", () => {
    const zip = new AdmZip();
    const buf = zip.toBuffer();
    expect(() => listSegments(buf)).toThrow();
  });

  it("unicode / emoji / RTL", () => {
    const buf = makeIdml([{ name: "Story_1", contents: ["Zażółć 🧪 گ"] }]);
    const segs = listSegments(buf);
    expect(segs[0].originalText).toBe("Zażółć 🧪 گ");
  });

  it("pomija Content będące czystym whitespace", () => {
    const buf = makeIdml([
      { name: "Story_1", contents: ["A", "   ", "\n", "B"] },
    ]);
    const segs = listSegments(buf);
    expect(segs.map((s) => s.originalText)).toEqual(["A", "B"]);
  });
});
