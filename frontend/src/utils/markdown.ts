/**
 * Normalizes Markdown text to ensure tables, lists, and headers format properly.
 * Specifically fixes collapsed Markdown tables where line breaks between pipe rows were lost.
 */
export function formatMarkdownContent(content: string): string {
  if (!content) return '';

  let text = content;

  // Fix collapsed pipe tables (e.g. "| Col 1 | Col 2 | |---|---| | Row 1 | Row 2 |")
  // Replace space-separated pipe boundaries `| |` with a proper line break `|\n|`
  text = text.replace(/\|\s*\|/g, '|\n|');

  // Ensure table starts with a new line if attached to preceding text
  text = text.replace(/([^\n])(\|[^\n]+\|\n\|[-:\s|]+\|)/g, '$1\n\n$2');

  return text;
}
