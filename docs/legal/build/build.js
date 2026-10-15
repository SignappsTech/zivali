// Build najdimo-pravni-pregled.docx from docs/legal/lawyer-briefing.sl.md.
// Usage: node build.js <input.md> <output.docx> [pages.json]
// pages.json maps TOC bookmark ids to page numbers (second pass).
const fs = require("fs");
const JSZip = require("jszip");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, LevelFormat, Header, Footer,
  PageNumber, Tab, TabStopType, Bookmark, PageBreak, VerticalAlign, TableLayoutType,
} = require("docx");

const [, , inPath, outPath, pagesPath] = process.argv;
const pages = pagesPath && fs.existsSync(pagesPath) ? JSON.parse(fs.readFileSync(pagesPath, "utf8")) : {};
const md = fs.readFileSync(inPath, "utf8").replace(/\r\n/g, "\n");

// ---------- page geometry (A4, 2 cm margins) ----------
const PAGE_W = 11906, PAGE_H = 16838, MARGIN = 1134;
const TEXT_W = PAGE_W - 2 * MARGIN; // 9638 DXA
const FONT = "Calibri";
const MONO = "Courier New";
const INK = "1A1A1A", MUTED = "5F6B70", ACCENT = "1F4E5F", RULE = "A6B4B9", HEAD_FILL = "DCE8EC";

// ---------- markdown block parser ----------
function parseBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(/^(#{1,3}) (.*)$/))) { blocks.push({ type: "h", level: m[1].length, text: m[2].trim() }); i++; continue; }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const l = lines[i].trim();
        if (!/^\|[\s\-:|]+\|$/.test(l)) rows.push(l.slice(1, -1).split("|").map((c) => c.trim()));
        i++;
      }
      blocks.push({ type: "table", rows });
      continue;
    }
    if (line.startsWith(">")) {
      const parts = [];
      while (i < lines.length && lines[i].startsWith(">")) { parts.push(lines[i].replace(/^>\s?/, "")); i++; }
      blocks.push({ type: "quote", text: parts.join(" ") });
      continue;
    }
    if ((m = line.match(/^(\s*)([-*]|\d+\.) (.*)$/))) {
      const items = [];
      while (i < lines.length && (m = lines[i].match(/^(\s*)([-*]|\d+\.) (.*)$/))) {
        items.push({ level: Math.floor(m[1].length / 2), ordered: /\d/.test(m[2]), text: m[3] });
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }
    const parts = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3} |\||>|\s*([-*]|\d+\.) )/.test(lines[i])) { parts.push(lines[i].trim()); i++; }
    blocks.push({ type: "p", text: parts.join(" ") });
  }
  return blocks;
}

// ---------- inline formatting: **bold**, `code`, [text](link) ----------
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0, m;
  const push = (t, extra = {}) => { if (t) out.push(new TextRun({ text: t, ...base, ...extra })); };
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    if (m[2] !== undefined) push(m[2], { bold: true });
    else if (m[3] !== undefined) push(m[3], { font: MONO, size: base.size ? base.size - 2 : 19 });
    else push(m[4]);
    last = re.lastIndex;
  }
  push(text.slice(last));
  return out;
}

// ---------- tables ----------
const PRESETS = [
  { match: ["Oznaka", "Vprašanje"], pct: [8, 34, 34, 12, 12] },
  { match: ["Oznaka", "Funkcija"], pct: [7, 31, 22, 30, 10] },
  { match: ["Ponudnik", "Vloga (predlog)"], pct: [16, 14, 17, 20, 20, 13] },
  { match: ["Podatki", "Kje"], pct: [24, 11, 33, 16, 16] },
  { match: ["Obdelovalec", "Kako se sklene pogodba o obdelavi"], pct: [14, 25, 18, 32, 11] },
  { match: ["Št.", "Zahteva"], pct: [7, 75, 18] },
  { match: ["Oznaka", "Odločitev"], pct: [8, 30, 46, 16] },
  { match: ["Oznaka", "Tveganje za posameznike"], pct: [7, 25, 14, 42, 12] },
  { match: ["Potek", "Kaj se zgodi"], pct: [19, 63, 18] },
  { match: ["Dokument", "Datoteka"], pct: [16, 20, 22, 17, 25] },
  { match: ["Dokument", "Potreben pred"], pct: [45, 20, 35] },
  { match: ["Vsebina", "Datoteka"], pct: [30, 30, 40] },
  { match: ["Merilo (smernice EOVP)"], pct: [38, 14, 48] },
  { match: ["Del", "Kaj vsebuje"], pct: [30, 58, 12] },
  { match: ["Različica", "Datum"], pct: [12, 16, 72] },
  { match: ["Polje", "Vrednost"], pct: [22, 78] },
];

function widthsFor(header) {
  const p = PRESETS.find((x) => x.match.every((h, k) => header[k] === h) && x.pct.length === header.length);
  const pct = p ? p.pct : header.map(() => 100 / header.length);
  const w = pct.map((x) => Math.floor((TEXT_W * x) / 100));
  w[w.length - 1] += TEXT_W - w.reduce((a, b) => a + b, 0);
  return w;
}

const border = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const borders = { top: border, bottom: border, left: border, right: border };

function makeTable(rows, opts = {}) {
  const header = rows[0];
  const widths = widthsFor(header);
  const size = header.length >= 5 ? 16 : 18; // 8 pt or 9 pt
  const lastIdx = header.length - 1;
  const tableRows = rows.map((cells, r) => {
    const isHead = r === 0 && !opts.noHeader;
    const na = !isHead && cells[lastIdx] === "Ni več relevantno";
    return new TableRow({
      tableHeader: isHead,
      cantSplit: true,
      children: cells.map((c, k) => {
        const strong = isHead || (!isHead && c === "Lansiranje (blokira)") || (opts.firstColBold && k === 0);
        const checkbox = c === "☐";
        const base = { size, color: na ? "7F7F7F" : INK, bold: strong || undefined };
        const children = checkbox
          ? [new TextRun({ text: "☐", size: size + 6, font: "Segoe UI Symbol" })]
          : runs(c, base);
        return new TableCell({
          width: { size: widths[k], type: WidthType.DXA },
          borders,
          verticalAlign: VerticalAlign.TOP,
          shading: isHead ? { fill: HEAD_FILL, type: ShadingType.CLEAR, color: "auto" } : undefined,
          margins: { top: 50, bottom: 50, left: 90, right: 90 },
          children: [new Paragraph({ spacing: { before: 0, after: 0, line: 252 }, alignment: checkbox ? AlignmentType.CENTER : AlignmentType.LEFT, children })],
        });
      }),
    });
  });
  return new Table({
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    rows: tableRows,
  });
}

// ---------- body ----------
const blocks = parseBlocks(md);
const startIdx = blocks.findIndex((b) => b.type === "h" && b.level === 1);
const metaTable = blocks.slice(0, startIdx).find((b) => b.type === "table");
const disclaimer = blocks.slice(0, startIdx).find((b) => b.type === "quote");
const body = blocks.slice(startIdx);

const tocEntries = [];
let olInstance = 0;
let hCount = 0;
const children = [];

function spacer(after = 120) { return new Paragraph({ spacing: { before: 0, after }, children: [] }); }

for (const b of body) {
  if (b.type === "h") {
    hCount++;
    const id = `_Toc${String(hCount).padStart(6, "0")}`;
    const level = b.level === 1 ? HeadingLevel.HEADING_1 : b.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
    if (b.level <= 2) tocEntries.push({ id, level: b.level, text: b.text });
    children.push(new Paragraph({
      heading: level,
      pageBreakBefore: b.level === 1 && hCount > 1,
      children: [new Bookmark({ id, children: [new TextRun(b.text)] })],
    }));
  } else if (b.type === "p") {
    children.push(new Paragraph({ spacing: { after: 140 }, children: runs(b.text) }));
  } else if (b.type === "quote") {
    children.push(new Paragraph({
      shading: { fill: "F3E9D2", type: ShadingType.CLEAR, color: "auto" },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: "B7862B", space: 8 } },
      spacing: { before: 120, after: 200 },
      indent: { left: 160, right: 160 },
      children: runs(b.text),
    }));
  } else if (b.type === "list") {
    const anyOrderedTop = b.items.some((x) => x.ordered);
    if (anyOrderedTop) olInstance++;
    const inst = olInstance;
    for (const it of b.items) {
      children.push(new Paragraph({
        numbering: it.ordered ? { reference: "ol", level: it.level, instance: inst } : { reference: "ul", level: it.level },
        spacing: { after: 80 },
        children: runs(it.text),
      }));
    }
    children.push(spacer(60));
  } else if (b.type === "table") {
    children.push(makeTable(b.rows));
    children.push(spacer(160));
  }
}

// ---------- title page ----------
const meta = Object.fromEntries((metaTable ? metaTable.rows.slice(1) : []).map((r) => [r[0], r[1]]));
const titlePage = [
  new Paragraph({ spacing: { before: 2600, after: 0 }, children: [new TextRun({ text: "NAJDIMO", bold: true, size: 26, color: ACCENT, characterSpacing: 40 })] }),
  new Paragraph({ spacing: { before: 120, after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 12 } }, children: [new TextRun({ text: "Najdimo: gradivo za pravni pregled", bold: true, size: 52, color: INK })] }),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "Storitev za iskanje izgubljenih psov in mačk v Sloveniji: funkcije, tokovi podatkov, odprta pravna vprašanja, osnutek ocene učinka, roki hrambe in pogodbe o obdelavi", size: 24, color: MUTED })] }),
  new Paragraph({ spacing: { before: 480, after: 60 }, children: [new TextRun({ text: "15. oktober 2026 · različica 0.2", size: 24, color: INK })] }),
  new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: "Ni pravni nasvet; za pregled odvetnika", bold: true, size: 24, color: "8A5A00" })] }),
  makeTable([["Polje", "Vrednost"], ...Object.entries(meta)], { noHeader: false, firstColBold: true }),
  new Paragraph({ spacing: { before: 360 }, children: [new TextRun({ text: "Osnutek – zahteva pregled naročnika in pravnika.", italics: true, size: 20, color: MUTED })] }),
];

// ---------- TOC page (placeholder replaced in the XML pass) ----------
const tocPage = [
  new Paragraph({ pageBreakBefore: true, spacing: { after: 240 }, children: [new TextRun({ text: "Kazalo", bold: true, size: 32, color: ACCENT })] }),
  new Paragraph({ children: [new TextRun("%%TOC%%")] }),
];

const intro = disclaimer ? [
  new Paragraph({
    pageBreakBefore: true,
    shading: { fill: "F3E9D2", type: ShadingType.CLEAR, color: "auto" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: "B7862B", space: 8 } },
    spacing: { before: 0, after: 240 },
    indent: { left: 160, right: 160 },
    children: runs(disclaimer.text),
  }),
] : [];
const footerPara = new Paragraph({
  style: "FooterSmall",
  tabStops: [{ type: TabStopType.RIGHT, position: TEXT_W }],
  border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
  children: [
    new TextRun("Najdimo: gradivo za pravni pregled · v0.2 · Ni pravni nasvet; za pregled odvetnika"),
    new TextRun({ children: [new Tab(), "Stran ", PageNumber.CURRENT, " od ", PageNumber.TOTAL_PAGES] }),
  ],
});

const doc = new Document({
  creator: "Najdimo (Signapps)",
  title: "Najdimo: gradivo za pravni pregled",
  description: "Gradivo za pravni pregled, različica 0.2, 15. 10. 2026. Ni pravni nasvet; za pregled odvetnika.",
  language: "sl-SI",
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: INK, language: { value: "sl-SI" } }, paragraph: { spacing: { line: 276 } } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 32, bold: true, color: ACCENT }, paragraph: { spacing: { before: 0, after: 200 }, outlineLevel: 0, keepNext: true } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 26, bold: true, color: ACCENT }, paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1, keepNext: true } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 22, bold: true, color: INK }, paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 2, keepNext: true } },
      { id: "FooterSmall", name: "Footer Small", basedOn: "Normal",
        run: { font: FONT, size: 16, color: MUTED }, paragraph: { spacing: { before: 0, after: 0 } } },
      { id: "TOC1", name: "toc 1", basedOn: "Normal", next: "Normal",
        run: { font: FONT, size: 22, bold: true }, paragraph: { spacing: { before: 120, after: 40 } } },
      { id: "TOC2", name: "toc 2", basedOn: "Normal", next: "Normal",
        run: { font: FONT, size: 20 }, paragraph: { spacing: { before: 0, after: 30 }, indent: { left: 360 } } },
    ],
  },
  numbering: {
    config: [
      { reference: "ul", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 260 } } } },
      ] },
      { reference: "ol", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } } } },
        { level: 1, format: LevelFormat.DECIMAL, text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 300 } } } },
      ] },
    ],
  },
  sections: [{
    properties: {
      titlePage: true,
      page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, header: 567, footer: 567 } },
    },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Najdimo · gradivo za pravni pregled", size: 16, color: MUTED })] })] }), first: new Header({ children: [] }) },
    footers: { default: new Footer({ children: [footerPara] }), first: new Footer({ children: [] }) },
    children: [...titlePage, ...tocPage, ...intro, ...children],
  }],
});

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function tocXml() {
  const instr = '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>';
  return tocEntries.map((e, k) => {
    const page = pages[e.id] ?? "0";
    const style = e.level === 1 ? "TOC1" : "TOC2";
    const start = k === 0 ? instr : "";
    const end = k === tocEntries.length - 1 ? '<w:r><w:fldChar w:fldCharType="end"/></w:r>' : "";
    return `<w:p><w:pPr><w:pStyle w:val="${style}"/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${TEXT_W}"/></w:tabs></w:pPr>${start}<w:hyperlink w:anchor="${e.id}" w:history="1"><w:r><w:t xml:space="preserve">${esc(e.text)}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>${page}</w:t></w:r></w:hyperlink>${end}</w:p>`;
  }).join("");
}

(async () => {
  const buf = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buf);
  let xml = await zip.file("word/document.xml").async("string");
  const marker = xml.indexOf("%%TOC%%");
  if (marker < 0) throw new Error("TOC marker missing");
  const pStart = Math.max(xml.lastIndexOf("<w:p>", marker), xml.lastIndexOf("<w:p ", marker));
  const pEnd = xml.indexOf("</w:p>", marker) + "</w:p>".length;
  xml = xml.slice(0, pStart) + tocXml() + xml.slice(pEnd);
  // docx-js gives every bookmark w:id="1"; ids must be unique. Bookmarks are not nested,
  // so the k-th bookmarkEnd closes the k-th bookmarkStart.
  let bs = 0, be = 0;
  xml = xml.replace(/(<w:bookmarkStart\b[^>]*?\bw:id=")\d+(")/g, (_, a, b) => `${a}${++bs}${b}`);
  xml = xml.replace(/(<w:bookmarkEnd\b[^>]*?\bw:id=")\d+(")/g, (_, a, b) => `${a}${++be}${b}`);
  if (bs !== be) throw new Error(`bookmark start/end mismatch ${bs}/${be}`);
  zip.file("word/document.xml", xml);
  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(outPath, out);
  fs.writeFileSync(outPath + ".toc.json", JSON.stringify(tocEntries, null, 1));
  console.log(`wrote ${outPath}: ${tocEntries.length} TOC entries, ${hCount} headings`);
})().catch((e) => { console.error(e); process.exit(1); });
