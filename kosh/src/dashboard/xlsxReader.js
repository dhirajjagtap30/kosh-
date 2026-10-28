/* Minimal .xlsx reader (no library needed): an .xlsx file is a zip of XML files.
   Returns the first sheet as rows of text; date cells are converted to "YYYY-MM-DD HH:MM:SS".
   Old .xls files are a different (binary) format and are not supported: save them as .xlsx or .csv in Excel. */

const dec = new TextDecoder("utf-8");
const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "undefined") throw new Error("This browser cannot open Excel files. Please save the file as CSV and import that.");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/* name -> Uint8Array for every file inside the zip */
async function unzip(buf) {
  const b = new Uint8Array(buf);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (u32(b, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("This is not a valid .xlsx file.");
  const count = u16(b, eocd + 10);
  let p = u32(b, eocd + 16);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (u32(b, p) !== 0x02014b50) break;
    const method = u16(b, p + 10), csize = u32(b, p + 20), nlen = u16(b, p + 28), elen = u16(b, p + 30), clen = u16(b, p + 32), lho = u32(b, p + 42);
    const name = dec.decode(b.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + elen + clen;
    if (!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|styles\.xml|worksheets\/[^/]+\.xml)$/.test(name)) continue;
    const start = lho + 30 + u16(b, lho + 26) + u16(b, lho + 28);
    const raw = b.subarray(start, start + csize);
    files[name] = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null;
  }
  return files;
}

const text = (f) => (f ? dec.decode(f) : "");
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&amp;/g, "&");
const colIndex = (ref) => { const l = ref.match(/^[A-Z]+/)[0]; let n = 0; for (const ch of l) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
const BUILTIN_DATE = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
const p2 = (n) => String(n).padStart(2, "0");

function serialToText(v) {
  const days = Math.floor(v);
  const secs = Math.round((v - days) * 86400);
  const hh = Math.floor(secs / 3600), mm = Math.floor((secs % 3600) / 60), ss = secs % 60;
  const t = `${p2(hh)}:${p2(mm)}:${p2(ss)}`;
  if (days < 1) return t; // time only
  const d = new Date(Date.UTC(1899, 11, 30) + days * 86400000);
  const date = `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
  return secs ? `${date} ${t}` : date;
}

export async function readXlsx(buf) {
  const f = await unzip(buf);
  if (!f["xl/workbook.xml"]) throw new Error("This is not a valid .xlsx file.");

  // which sheet file is the first sheet
  const wb = text(f["xl/workbook.xml"]);
  const rels = text(f["xl/_rels/workbook.xml.rels"]);
  const first = wb.match(/<sheet\b[^>]*>/);
  let sheetPath = "xl/worksheets/sheet1.xml";
  if (first) {
    const rid = (first[0].match(/r:id="([^"]+)"/) || [])[1];
    const rel = rid && rels.split("<Relationship ").find((x) => x.includes(`Id="${rid}"`));
    const target = rel && (rel.match(/Target="([^"]+)"/) || [])[1];
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  if (!f[sheetPath]) sheetPath = Object.keys(f).find((k) => k.startsWith("xl/worksheets/")) || sheetPath;
  if (!f[sheetPath]) throw new Error("No sheet found in this Excel file.");

  const shared = [];
  if (f["xl/sharedStrings.xml"]) for (const m of text(f["xl/sharedStrings.xml"]).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) shared.push(unesc([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join("")));

  // which cell styles are dates
  const styles = text(f["xl/styles.xml"]);
  const custom = new Map();
  for (const m of styles.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) custom.set(Number(m[1]), m[2]);
  const xfs = (styles.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/) || [, ""])[1];
  const isDateStyle = [...xfs.matchAll(/<xf\b[^>]*>/g)].map((m) => {
    const id = Number((m[0].match(/numFmtId="(\d+)"/) || [, 0])[1]);
    return BUILTIN_DATE.has(id) || (custom.has(id) && /[dmyhs]/i.test(custom.get(id).replace(/"[^"]*"|\[[^\]]*\]|\\./g, "")));
  });

  const rows = [];
  for (const rm of text(f[sheetPath]).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1], inner = cm[2] || "";
      const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
      if (!ref) continue;
      const type = (attrs.match(/\bt="([^"]+)"/) || [])[1];
      const style = Number((attrs.match(/\bs="(\d+)"/) || [, 0])[1]);
      const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      let val = "";
      if (type === "s") val = shared[Number(v)] || "";
      else if (type === "inlineStr") val = unesc([...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(""));
      else if (v !== undefined) val = type === "str" || type === "b" || type === "e" ? unesc(v) : isDateStyle[style] ? serialToText(Number(v)) : String(Number(v));
      row[colIndex(ref)] = val;
    }
    rows.push(Array.from(row, (x) => (x === undefined ? "" : x)));
  }
  const width = Math.max(0, ...rows.map((r) => r.length));
  return rows.filter((r) => r.some((c) => String(c).trim() !== "")).map((r) => { while (r.length < width) r.push(""); return r; });
}
