import fs from 'node:fs/promises';
import { getWikiChapters } from '../src/data/wikiCatalog.js';
import { parseWikiChapter } from '../server/wikiSource.js';

await fs.mkdir('artifacts/wiki-source', { recursive: true });
for (const [storyId, indexes] of [
  ['bach-the-cau-tien', [1, 515, 723]],
  ['moi-ngay-mot-que', [1, 281, 509]],
]) {
  for (const index of indexes) {
    const metadata = getWikiChapters(storyId).find(ch => ch.chapterIndex === index);
    const response = await fetch(metadata.sourceUrl, { signal: AbortSignal.timeout(25000) });
    const html = await response.text();
    if (!response.ok) throw Error(`HTTP ${response.status}: ${storyId}/${index}`);
    await fs.writeFile(`artifacts/wiki-source/${storyId}-${index}.html`, html);
    try {
      const chapter = parseWikiChapter(html, metadata);
      console.log(JSON.stringify({ storyId, index, status: response.status, characters: chapter.content.length, paragraphs: chapter.content.split('\n\n').length }));
    } catch (error) {
      if (storyId !== 'moi-ngay-mot-que' || index !== 281) throw error;
      console.log(JSON.stringify({ storyId, index, sourceError: error.message }));
    }
  }
}
