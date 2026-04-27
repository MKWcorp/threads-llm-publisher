const MAX_CHARS = 500;

/**
 * Strips HTML tags and decodes basic HTML entities.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Splits a long text into parts of at most MAX_CHARS characters.
 * Tries to split on paragraph breaks, then sentence boundaries.
 */
function splitText(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];

  const parts: string[] = [];

  // First try splitting on double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/);

  let current = "";
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((current + (current ? "\n\n" : "") + trimmed).length <= MAX_CHARS) {
      current = current ? current + "\n\n" + trimmed : trimmed;
    } else {
      if (current) parts.push(current.trim());
      // If a single paragraph is too long, split further by sentence
      if (trimmed.length > MAX_CHARS) {
        const sentences = splitBySentence(trimmed);
        parts.push(...sentences);
        current = "";
      } else {
        current = trimmed;
      }
    }
  }
  if (current.trim()) parts.push(current.trim());

  return parts.filter(Boolean);
}

/**
 * Splits text that is too long into sentence-boundary chunks.
 */
function splitBySentence(text: string): string[] {
  const parts: string[] = [];
  // Split on sentence endings followed by space/newline
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text];

  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length <= MAX_CHARS) {
      current += sentence;
    } else {
      if (current.trim()) parts.push(current.trim());
      // If a single sentence exceeds limit, hard-split
      if (sentence.trim().length > MAX_CHARS) {
        const chunks = hardSplit(sentence.trim());
        parts.push(...chunks);
        current = "";
      } else {
        current = sentence;
      }
    }
  }
  if (current.trim()) parts.push(current.trim());

  return parts.filter(Boolean);
}

/**
 * Last resort: split by character limit at word boundaries.
 */
function hardSplit(text: string): string[] {
  const parts: string[] = [];
  const words = text.split(" ");
  let current = "";

  for (const word of words) {
    if ((current + (current ? " " : "") + word).length <= MAX_CHARS) {
      current = current ? current + " " + word : word;
    } else {
      if (current) parts.push(current);
      current = word;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * Main export: takes raw HTML, returns ordered thread parts ready to publish.
 * Each part is <= 500 characters.
 */
export function splitHtmlToThreads(html: string): string[] {
  const plainText = stripHtml(html);
  const parts = splitText(plainText);
  return parts;
}
