import AdmZip from "adm-zip";
import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";
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

// Sprawdza, czy dany ZIP to pakiet IDML
function isIdmlPackage(zip: AdmZip): boolean {
  const names = zip.getEntries().map((e) => e.entryName);
  const hasDesignmap = names.some((n) => n.toLowerCase() === "designmap.xml");
  const hasStories = names.some(
    (n) => n.startsWith("Stories/") && n.endsWith(".xml")
  );
  return hasDesignmap && hasStories;
}

// Próba potraktowania bufora jako pojedynczy IDML
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

/// Wyodrębnij IDML'e z kontenera ZIP/IDML
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

/// Pobierz zip + listę stories z IDML
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
        if (k === "Content" && typeof v === "string" && v.trim().length > 0) {
          nodes.push(v);
        }
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

function xmlEscapeText(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toCdata(s: string) {
  return "<![CDATA[" + s.replaceAll("]]>", "]]]]><![CDATA[>") + "]]>";
}

const WS_START = /^\s/;
const BREAKER_END = /(?:[\p{L}\p{N}]|[)\]\}»”’"'“«:;!?%.,…—–-])$/u;

function needsSpacer(trailing: string, text: string) {
  return (!trailing || !WS_START.test(trailing)) && BREAKER_END.test(text);
}


function buildContentNode(
  attrs: string,
  leading: string,
  text: string,
  trailing: string
) {
  const safe = xmlEscapeText(text);
  const spacer = needsSpacer(trailing, text) ? " " : "";
  return `<Content${attrs}>${leading}${safe}${spacer}${trailing}</Content>`;
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

    let xml = s.getData().toString("utf8");

    let counter = 0;
    let replaced = xml.replace(
      /<Content([^>]*)>([\s\S]*?)<\/Content>/g,
      (full, attrs: string, inner: string) => {
        if (inner.trim().length === 0) return full;
        const t = targets.find((x) => x.index === counter);
        counter++;
        if (!t) return full;

        const m = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
        const leading = m?.[1] ?? "";
        const trailing = m?.[3] ?? "";

        return buildContentNode(attrs, leading, t.translatedText, trailing);
      }
    );

    // walidacja całości
    if (XMLValidator.validate(replaced) !== true) {
      // fallback segment-po-segmencie z lokalną walidacją i CDATA
      let idx = 0;
      replaced = xml.replace(
        /<Content([^>]*)>([\s\S]*?)<\/Content>/g,
        (full, attrs: string, inner: string) => {
          if (inner.trim().length === 0) return full;
          const t = targets.find((x) => x.index === idx);
          idx++;
          if (!t) return full;

          const m = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
          const leading = m?.[1] ?? "";
          const trailing = m?.[3] ?? "";

          const tryEscaped = buildContentNode(
            attrs,
            leading,
            t.translatedText,
            trailing
          );
          const probe = replacedFragment(xml, full, tryEscaped);
          if (XMLValidator.validate(probe) === true) return tryEscaped;

          const spacer = needsSpacer(trailing, t.translatedText) ? " " : "";
          const cdata = `<Content${attrs}>${leading}${toCdata(
            t.translatedText
          )}${spacer}${trailing}</Content>`;
          const probe2 = replacedFragment(xml, full, cdata);
          if (XMLValidator.validate(probe2) === true) return cdata;

          return full;
        }
      );
    }

    replaced = replaced.replace(/<\/Content>(?=\S)/g, "</Content> ");

    zip.updateFile(s.entryName, Buffer.from(replaced, "utf8"));
  }

  return zip.toBuffer();
}

function replacedFragment(doc: string, from: string, to: string) {
  const pos = doc.indexOf(from);
  if (pos < 0) return doc;
  return doc.slice(0, pos) + to + doc.slice(pos + from.length);
}
