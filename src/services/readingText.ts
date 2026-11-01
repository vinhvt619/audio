const MAX_READING_BLOCK = 600;

/** Share paragraph boundaries between the reader, TTS engine and player.
 * Some imported/crawled chapters have no line breaks at all. Split those long
 * blocks at sentence/word boundaries for reading without changing stored text.
 */
export function splitReadingParagraphs(content: string): string[] {
  return (content || '').replace(/\r\n?/g, '\n').split(/\n+/)
    .map(line => line.trim()).filter(Boolean).flatMap(paragraph => {
      if (paragraph.length <= 700) return [paragraph];
      const sentences = paragraph.split(/(?<=[.!?…][”"'’»]?)\s+/u);
      const blocks: string[] = [];
      let current = '';
      for (const sentence of sentences) {
        const parts = sentence.length > MAX_READING_BLOCK ? sentence.split(/\s+/u) : [sentence];
        for (const part of parts) {
          if (current && current.length + part.length + 1 > MAX_READING_BLOCK) {
            blocks.push(current);
            current = '';
          }
          current += (current ? ' ' : '') + part;
        }
      }
      if (current) blocks.push(current);
      return blocks;
    });
}
