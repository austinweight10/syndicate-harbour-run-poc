import type { ContentPackAssets } from "./types";

/**
 * Hand a marketing pack to Shopify Sidekick as a ready-to-run prompt.
 *
 * The deep link (`/admin?sidekick=<prompt>`) is how Sidekick describes
 * pre-filling a prompt; it is not in Shopify's developer docs, so the panel
 * also offers "Copy prompt" as a fallback that always works.
 */

export type PackForSidekick = {
  headline: string;
  rationale: string;
  assets: ContentPackAssets;
};

export type OccasionForSidekick = {
  name: string;
  windowLabel: string | null;
  city: string | null;
};

/** Keep the encoded URL well under common 8 KB request-line limits. */
export const MAX_PROMPT_CHARS = 3500;

const EXCERPT_CHARS = 320;

/** Plain text from pack HTML: tags stripped, entities decoded, whitespace collapsed. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/h[1-6])\s*\/?>/gi, " ")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "’")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ends with sentence punctuation so the next instruction doesn't run on. */
function sentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

function excerpt(html: string, max = EXCERPT_CHARS): string {
  const text = htmlToText(html);
  if (text.length <= max) return sentence(text);
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40)).trimEnd()}…`;
}

export function sidekickPrompt(pack: PackForSidekick, occasion: OccasionForSidekick, excerptChars = EXCERPT_CHARS): string {
  const { blog, page, banner, email, segments } = pack.assets;
  const where = [occasion.city ? `in ${occasion.city}` : null, occasion.windowLabel ? `(${occasion.windowLabel})` : null]
    .filter(Boolean)
    .join(" ");

  const lines: string[] = [
    `Help me launch a marketing campaign for "${occasion.name}"${where ? ` ${where}` : ""}.`,
    `My insights app, Syndicate, drafted the assets below from my orders. Create them in my store one at a time and confirm each before moving on. Keep the blog post, page and email as drafts or hidden so I can review them before anything goes live.`,
    `If any date below has already passed, ask me for new dates before creating anything.`,
    "",
    `1. Blog post: title "${blog.title}". ${blog.summary}${excerptChars ? ` Cover: ${excerpt(blog.bodyHtml, excerptChars)}` : ""}`,
    `2. Page: title "${page.title}" with the URL handle "${page.handle}" (so it lives at /pages/${page.handle}).${excerptChars ? ` Content: ${excerpt(page.bodyHtml, excerptChars)}` : ""}`,
    `3. Homepage banner: headline "${banner.headline}", text "${banner.body}", and a button "${banner.ctaLabel}" linking to ${banner.ctaPath}. Use my theme's existing banner or announcement section; ask before adding custom code.`,
    `4. Email draft: subject "${email.subject}", preview text "${email.previewText}".${excerptChars ? ` Body: ${excerpt(email.bodyHtml, excerptChars)}` : ""}${email.personaTargets.length ? ` Audience: ${email.personaTargets.join(", ")}.` : ""}`,
  ];
  if (segments.length > 0) {
    lines.push("5. Customer segments (check each suggested query uses filters that are valid for my store, and fix it if not):");
    for (const segment of segments) {
      lines.push(`   - "${segment.name}": ${sentence(segment.description)} Suggested query: ${segment.query}`);
    }
  }
  if (pack.rationale) {
    lines.push("", `Why: ${pack.rationale}`);
  }

  const prompt = lines.join("\n");
  // Long packs: drop the body excerpts rather than cut the brief mid-sentence.
  if (prompt.length > MAX_PROMPT_CHARS && excerptChars > 0) {
    return sidekickPrompt(pack, occasion, excerptChars > 120 ? 120 : 0);
  }
  return prompt;
}

/** `https://{shop}.myshopify.com/admin?sidekick={prompt}` */
export function sidekickUrl(shopDomain: string, prompt: string): string {
  return `https://${shopDomain}/admin?sidekick=${encodeURIComponent(prompt)}`;
}
