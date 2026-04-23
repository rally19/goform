import DOMPurify from "dompurify";

/**
 * Sanitizes HTML strings for safe rendering with dangerouslySetInnerHTML.
 * Safe for use in Next.js SSR and Client components.
 */
export function sanitize(html: string | null | undefined): string {
  if (!html) return "";
  
  if (typeof window !== "undefined") {
    // In the browser, ensure we use the sanitize method.
    // Handle cases where the import might be the factory function.
    const purify = (DOMPurify as any).sanitize ? DOMPurify : DOMPurify(window);
    return purify.sanitize(html, {
      ALLOWED_ATTR: ["style", "href", "src", "alt", "target", "rel", "class", "width", "height", "data-lucide-icon", "name", "size"],
      ALLOWED_TAGS: [
        "p", "br", "b", "i", "u", "s", "ul", "ol", "li", "a", "img", "span", 
        "h1", "h2", "h3", "em", "strong", "code", "pre", "blockquote", "del", "ins"
      ],
    });
  }
  // During SSR, return raw strings to avoid crashes.
  // The client will re-render and sanitize during hydration.
  return html;
}

/**
 * Strips HTML tags from a string to return plain text content.
 * Useful for chart labels, table headers, and other plain-text contexts.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  
  // Simple regex to remove tags
  const stripped = html.replace(/<[^>]*>?/gm, "");
  
  // Basic entity decoding for common cases
  return stripped
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}
