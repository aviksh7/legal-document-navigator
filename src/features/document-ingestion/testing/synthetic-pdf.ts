// Synthetic fixtures only. No real agreement or personal information.
// Minimal PDF writer for parser acceptance, not a production PDF implementation.
import { createHash } from "node:crypto";

const padding = Buffer.from("28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a", "hex");
const md5 = (bytes: Uint8Array) => createHash("md5").update(bytes).digest();
const padded = (password: string) => Buffer.concat([Buffer.from(password, "ascii"), padding]).subarray(0, 32);
function rc4(key: Uint8Array, data: Uint8Array) {
  const state = Array.from({ length: 256 }, (_, i) => i); let j = 0;
  for (let i = 0; i < 256; i++) { j = (j + state[i] + key[i % key.length]) % 256; [state[i], state[j]] = [state[j], state[i]]; }
  let i = 0; j = 0;
  return Buffer.from(data.map(value => { i = (i + 1) % 256; j = (j + state[i]) % 256; [state[i], state[j]] = [state[j], state[i]]; return value ^ state[(state[i] + state[j]) % 256]; }));
}
export function syntheticPdf(pages: string[], options: { password?: string; imageOnly?: boolean; field?: boolean; overlayLines?: boolean } = {}) {
  const fileId = Buffer.alloc(16, 7);
  let key: Buffer | undefined;
  let encryption = "";
  if (options.password !== undefined) {
    const owner = rc4(md5(padded("synthetic-owner")).subarray(0, 5), padded(options.password));
    const permissions = Buffer.alloc(4); permissions.writeInt32LE(-4);
    key = md5(Buffer.concat([padded(options.password), owner, permissions, fileId])).subarray(0, 5);
    const user = rc4(key, padding);
    encryption = `<< /Filter /Standard /V 1 /R 2 /O <${owner.toString("hex")}> /U <${user.toString("hex")}> /P -4 >>`;
  }
  const objects: Buffer[] = [];
  const add = (text: string) => { objects.push(Buffer.from(text, "ascii")); return objects.length; };
  const stream = (text: string) => {
    const number = objects.length + 1;
    let data = Buffer.from(text, "ascii");
    if (key) {
      const suffix = Buffer.from([number & 255, (number >> 8) & 255, (number >> 16) & 255, 0, 0]);
      data = rc4(md5(Buffer.concat([key, suffix])).subarray(0, 10), data);
    }
    objects.push(Buffer.concat([Buffer.from(`<< /Length ${data.length} >>\nstream\n`), data, Buffer.from("\nendstream")]));
    return number;
  };
  add("placeholder catalog"); add("placeholder pages");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];
  for (const text of pages) {
    const escaped = text.split("\n").map(line => line.replace(/[\\()]/g, "\\$&"));
    const content = options.imageOnly ? "q 20 0 0 20 72 700 cm BI /W 1 /H 1 /BPC 8 /CS /RGB /F /ASCIIHexDecode ID FF0000> EI Q"
      : `BT /F1 11 Tf 72 720 Td ${escaped.map((line, i) => `${options.overlayLines ? "1 0 0 1 72 720 Tm " : i ? "0 -16 Td " : ""}(${line}) Tj`).join("\n")} ET`;
    const contentId = stream(content);
    pageIds.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  const fieldId = options.field ? add("<< /FT /Tx /T (SyntheticField) /V (Synthetic value) /Subtype /Widget /Rect [0 0 100 20] >>") : null;
  objects[0] = Buffer.from(`<< /Type /Catalog /Pages 2 0 R${fieldId ? ` /AcroForm << /Fields [${fieldId} 0 R] >>` : ""} >>`);
  objects[1] = Buffer.from(`<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] >>`);
  const encryptId = encryption ? add(encryption) : null;
  const chunks = [Buffer.from("%PDF-1.7\n")]; const offsets = [0]; let length = chunks[0].length;
  objects.forEach((object, i) => {
    offsets.push(length); const chunk = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), object, Buffer.from("\nendobj\n")]);
    chunks.push(chunk); length += chunk.length;
  });
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${encryptId ? ` /Encrypt ${encryptId} 0 R` : ""} /ID [<${fileId.toString("hex")}> <${fileId.toString("hex")}>] >>\nstartxref\n${length}\n%%EOF\n`));
  return new Uint8Array(Buffer.concat(chunks));
}
export const SYNTHETIC_PAGE = "SYNTHETIC-PHASE2-SENTINEL\nThe employee must give thirty days of written notice.\nThis authored fixture is only for deterministic parser testing.\nRepeated wording remains in the extracted source.\nThe employee must give thirty days of written notice.";
