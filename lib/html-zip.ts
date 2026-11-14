type ZipFile = { name: string; data: Uint8Array };

function bytesOf(view: Uint8Array) {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

async function inflate(compressed: Uint8Array) {
  const stream = new Blob([bytesOf(compressed)])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unzip(buffer: ArrayBuffer): Promise<ZipFile[]> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  const start = Math.max(0, bytes.length - 22 - 65535);
  for (let index = bytes.length - 22; index >= start; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error('That file is not a valid zip.');

  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const files: ZipFile[] = [];

  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder()
      .decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))
      .replace(/\\/g, '/');
    cursor += 46 + nameLength + extraLength + commentLength;
    if (!name || name.endsWith('/')) continue;

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    const data =
      method === 0 ? compressed : method === 8 ? await inflate(compressed) : null;
    if (!data) {
      throw new Error('This zip uses a compression type the app cannot read.');
    }
    files.push({ name, data });
  }

  return files;
}

function mimeFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'css') return 'text/css';
  return 'application/octet-stream';
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

function dataUrl(file: ZipFile) {
  return `data:${mimeFor(file.name)};base64,${toBase64(file.data)}`;
}

function references(name: string) {
  const base = name.split('/').pop() || name;
  return Array.from(new Set([name, `./${name}`, base, `./${base}`]));
}

function replaceAll(value: string, from: string, to: string) {
  return from ? value.split(from).join(to) : value;
}

function inlineAssets(html: string, files: ZipFile[]) {
  const images = files.filter((file) => /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name));
  const styles = files.filter((file) => /\.css$/i.test(file.name));
  let result = html;

  for (const style of styles) {
    let css = new TextDecoder().decode(style.data);
    for (const image of images) {
      const url = dataUrl(image);
      for (const ref of references(image.name)) css = replaceAll(css, ref, url);
    }
    for (const ref of references(style.name)) {
      const pattern = new RegExp(
        `<link\\b[^>]*href=["']${ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`,
        'gi',
      );
      result = result.replace(pattern, `<style>${css}</style>`);
    }
  }

  for (const image of images) {
    const url = dataUrl(image);
    for (const ref of references(image.name)) result = replaceAll(result, ref, url);
  }

  return result;
}

export async function htmlFromUpload(file: File) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm') || file.type === 'text/html') {
    return file.text();
  }

  if (!lower.endsWith('.zip') && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
    throw new Error('Upload an HTML file or a zip that contains one.');
  }

  const files = await unzip(await file.arrayBuffer());
  const htmlFile =
    files.find((item) => /(^|\/)index\.html?$/i.test(item.name)) ||
    files.find((item) => /\.html?$/i.test(item.name));
  if (!htmlFile) throw new Error('That zip does not contain an HTML file.');

  return inlineAssets(new TextDecoder().decode(htmlFile.data), files);
}

export function titleFromHtml(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() || '';
}
