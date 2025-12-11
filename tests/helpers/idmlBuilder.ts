import AdmZip from "adm-zip";

export function makeIdml(
  stories: Array<{ name: string; contents: Array<string | null | undefined> }>
) {
  const zip = new AdmZip();

  zip.addFile("designmap.xml", Buffer.from(`<Document/>`, "utf8"));

  for (const s of stories) {
    const storyXml = `
      <Story>
        ${s.contents
          .map((c) =>
            c == null
              ? `<Content></Content>`
              : `<Content>${escapeXml(c)}</Content>`
          )
          .join("")}
      </Story>
    `;
    zip.addFile(`Stories/${s.name}.xml`, Buffer.from(storyXml, "utf8"));
  }

  return zip.toBuffer();
}

function escapeXml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
