import JSZip from 'jszip';

export interface ParsedChapter {
  title: string;
  content: string;
}

export interface ParsedBook {
  title: string;
  author: string;
  description: string;
  coverDataUrl?: string;
  chapters: ParsedChapter[];
}

export async function parseTextFile(file: File): Promise<ParsedBook> {
  const text = await file.text();
  const rawFileName = file.name.replace(/\.[^/.]+$/, '');
  
  // Try to parse chapters by common patterns
  // Pattern: "Chương 1: ...", "Hồi 1: ...", "Chapter 1", etc.
  const chapterRegex = /(?:^|\n)(?=(?:Chương|Hồi|Tiết|Mục|Chapter|Phần)\s+[0-9IVXLCDMivxlcdm]+[\s\S]*?(?:\n|$))/i;
  
  const rawParts = text.split(chapterRegex);
  const chapters: ParsedChapter[] = [];

  // If chapter regex matched multiple parts
  if (rawParts.length > 1) {
    let intro = rawParts[0].trim();
    if (intro && intro.length > 50) {
      chapters.push({
        title: 'Lời mở đầu / Giới thiệu',
        content: intro,
      });
    }

    for (let i = 1; i < rawParts.length; i++) {
      const part = rawParts[i].trim();
      if (!part) continue;

      const lines = part.split('\n');
      const title = lines[0].trim().slice(0, 80);
      const content = lines.slice(1).join('\n').trim();

      if (content.length > 0) {
        chapters.push({
          title: title || `Chương ${chapters.length + 1}`,
          content: content,
        });
      }
    }
  }

  // Fallback: If no chapters found or only 1 big block, split by reasonable paragraphs or keep as 1 chapter
  if (chapters.length === 0) {
    chapters.push({
      title: rawFileName,
      content: text.trim(),
    });
  }

  return {
    title: rawFileName,
    author: 'Khuyết danh',
    description: `Tải lên từ tập tin ${file.name} (${chapters.length} chương)`,
    chapters,
  };
}

export async function parseEpubFile(file: File): Promise<ParsedBook> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  // 1. Read container.xml to locate content.opf
  const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) {
    throw new Error('Định dạng EPUB không hợp lệ (không tìm thấy META-INF/container.xml)');
  }

  const opfPathMatch = containerXml.match(/full-path="([^"]+)"/i);
  const opfPath = opfPathMatch ? opfPathMatch[1] : 'OEBPS/content.opf';
  const opfFolder = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';

  const opfContent = await loadedZip.file(opfPath)?.async('text');
  if (!opfContent) {
    throw new Error('Không đọc được nội dung cấu trúc EPUB');
  }

  // 2. Extract Title & Author from OPF
  const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
  const authorMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
  const descMatch = opfContent.match(/<dc:description[^>]*>([^<]+)<\/dc:description>/i);

  const title = titleMatch ? titleMatch[1].trim() : file.name.replace(/\.epub$/i, '');
  const author = authorMatch ? authorMatch[1].trim() : 'Không rõ tác giả';
  const description = descMatch ? stripHtml(descMatch[1].trim()) : `Sách điện tử định dạng EPUB`;

  // 3. Extract Manifest and Spine items
  const manifestMap: Record<string, string> = {};
  const manifestRegex = /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"/gi;
  let mMatch: RegExpExecArray | null;
  while ((mMatch = manifestRegex.exec(opfContent)) !== null) {
    manifestMap[mMatch[1]] = mMatch[2];
  }

  const spineIdrefs: string[] = [];
  const spineRegex = /<itemref\s+[^>]*idref="([^"]+)"/gi;
  let sMatch: RegExpExecArray | null;
  while ((sMatch = spineRegex.exec(opfContent)) !== null) {
    spineIdrefs.push(sMatch[1]);
  }

  // 4. Extract chapters
  const chapters: ParsedChapter[] = [];
  let chapIdx = 1;

  for (const idref of spineIdrefs) {
    const href = manifestMap[idref];
    if (!href) continue;

    // Resolve path relative to opfFolder
    const resolvedPath = cleanPath(opfFolder + href);
    const htmlFile = loadedZip.file(resolvedPath);
    if (!htmlFile) continue;

    const html = await htmlFile.async('text');
    const chapterTitleMatch = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const chapterTitle = chapterTitleMatch ? stripHtml(chapterTitleMatch[1]).trim() : `Chương ${chapIdx}`;

    const textContent = htmlToParagraphs(html);
    if (textContent.trim().length > 30) {
      chapters.push({
        title: chapterTitle || `Chương ${chapIdx}`,
        content: textContent,
      });
      chapIdx++;
    }
  }

  // 5. Try to extract cover image
  let coverDataUrl: string | undefined;
  const coverItem = Object.entries(manifestMap).find(([id, href]) => 
    id.toLowerCase().includes('cover') || href.toLowerCase().includes('cover')
  );

  if (coverItem) {
    const coverPath = cleanPath(opfFolder + coverItem[1]);
    const coverFile = loadedZip.file(coverPath);
    if (coverFile) {
      const base64 = await coverFile.async('base64');
      const ext = coverPath.split('.').pop()?.toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      coverDataUrl = `data:${mime};base64,${base64}`;
    }
  }

  return {
    title,
    author,
    description,
    coverDataUrl,
    chapters: chapters.length > 0 ? chapters : [{ title: 'Toàn bộ nội dung', content: 'Nội dung sách' }],
  };
}

function cleanPath(path: string): string {
  // Normalize ../ and ./
  const parts = path.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function htmlToParagraphs(html: string): string {
  // Replace <p>, <br>, <div> with newlines
  const formatted = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n');

  return stripHtml(formatted)
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n\n');
}

export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration || 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}
