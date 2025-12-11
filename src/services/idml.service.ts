import AdmZip from "adm-zip";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { AppError } from "@/utils/errors";

export type Segment = {
  storyPath: string;
  index: number;
  originalText: string;
};
export type Replacement = {
  storyPath: string;
  index: number;
  translatedText: string;
};

const parser = new XMLParser({ ignoreAttributes: false });
const builder = new XMLBuilder({ ignoreAttributes: false });

function isIdmlPackage(zip: AdmZip): boolean {
  const names = zip.getEntries().map((e) => e.entryName);
  const hasDesignmap = names.some((n) => n.toLowerCase() === "designmap.xml");
  const hasStories = names.some(
    (n) => n.startsWith("Stories/") && n.endsWith(".xml")
  );
  return hasDesignmap && hasStories;
}

function asSingleIfIdml(buf: Buffer, name?: string) {
  try {
    const zip = new AdmZip(buf);
    if (isIdmlPackage(zip)) {
      return [{ name: name ?? "document.idml", buf }] as Array<{
        name: string;
        buf: Buffer;
      }>;
    }
  } catch {
    //
  }
  return null;
}

export function enumerateIdmlsFromZipContainer(
  container: Buffer,
  opts?: { requireAtLeastOne?: boolean }
): Array<{ name: string; buf: Buffer }> {
  const single = asSingleIfIdml(container);
  if (single) return single;

  let zip: AdmZip;
  try {
    zip = new AdmZip(container);
  } catch {
    throw new AppError(422, "Invalid ZIP/IDML payload");
  }

  const idmlEntries = zip
    .getEntries()
    .filter((e) => /\.idml$/i.test(e.entryName));
  const results: Array<{ name: string; buf: Buffer }> = [];

  for (const e of idmlEntries) {
    const inner = e.getData();
    try {
      const innerZip = new AdmZip(inner);
      if (isIdmlPackage(innerZip)) {
        const base = e.entryName.split("/").pop() || e.entryName;
        results.push({ name: base, buf: inner });
      }
    } catch {
      //
    }
  }

  if (opts?.requireAtLeastOne && results.length === 0) {
    throw new AppError(422, "No valid IDML files inside ZIP");
  }
  return results;
}

function getZipFromIdml(idmlBuf: Buffer) {
  const zip = new AdmZip(idmlBuf);
  if (!isIdmlPackage(zip)) {
    throw new AppError(
      422,
      "Invalid IDML package (missing designmap.xml/Stories)"
    );
  }
  const stories = zip
    .getEntries()
    .filter(
      (e) =>
        e.entryName.startsWith("Stories/Story_") && e.entryName.endsWith(".xml")
    )
    .sort((a, b) => a.entryName.localeCompare(b.entryName));
  return { zip, stories };
}

export function listSegments(idml: Buffer): Segment[] {
  const { stories } = getZipFromIdml(idml);
  const segments: Segment[] = [];

  for (const s of stories) {
    const xml = s.getData().toString("utf8");
    const obj = parser.parse(xml) as any;

    const nodes: string[] = [];
    const walk = (n: any) => {
      if (!n || typeof n !== "object") return;
      for (const k of Object.keys(n)) {
        const v = (n as any)[k];
        if (k === "Content" && typeof v === "string" && v.trim().length > 0)
          nodes.push(v);
        if (v && typeof v === "object") walk(v);
      }
    };
    walk(obj);

    nodes.forEach((t, i) =>
      segments.push({ storyPath: s.entryName, index: i, originalText: t })
    );
  }
  return segments;
}

export function replaceSegments(idml: Buffer, repl: Replacement[]) {
  const { zip, stories } = getZipFromIdml(idml);

  const byStory = new Map<
    string,
    Array<{ index: number; translatedText: string }>
  >();
  for (const r of repl) {
    byStory.set(r.storyPath, [
      ...(byStory.get(r.storyPath) ?? []),
      { index: r.index, translatedText: r.translatedText },
    ]);
  }

  for (const s of stories) {
    const targets = byStory.get(s.entryName);
    if (!targets?.length) continue;

    const xml = s.getData().toString("utf8");
    const obj = parser.parse(xml) as any;

    const nodes: Array<{ parent: any; key: string }> = [];
    const walk = (n: any) => {
      if (!n || typeof n !== "object") return;
      for (const k of Object.keys(n)) {
        const v = (n as any)[k];
        if (k === "Content" && typeof v === "string" && v.trim().length > 0)
          nodes.push({ parent: n, key: k });
        if (v && typeof v === "object") walk(v);
      }
    };
    walk(obj);

    for (const t of targets) {
      const node = nodes[t.index];
      if (node) node.parent[node.key] = t.translatedText;
    }

    zip.updateFile(s.entryName, Buffer.from(builder.build(obj), "utf8"));
  }
  return zip.toBuffer();
}
