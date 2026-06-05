import { chromium } from "playwright";
import { requireAdmin } from "@/lib/supabase";

const LIKE_SELECTORS = [
  "[data-test-likes-count]",
  ".o-noteLikeV3__count",
  ".a-icon__count",
  "button[aria-label*='スキ'] span",
];

const COMMENT_SELECTORS = [
  "[data-test-comments-count]",
  "[href$='#comments'] span",
];

function parseInt0(s: string | null | undefined): number {
  if (!s) return 0;
  const n = parseInt(s.replace(/[,\s]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export async function watchNotePost(
  post_url: string,
  post_id: string,
  hoursSincePost: number,
): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(post_url, { waitUntil: "networkidle", timeout: 30000 });

    const likesText = await page.evaluate((selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el?.textContent) return el.textContent.trim();
      }
      return null;
    }, LIKE_SELECTORS);

    const commentsText = await page.evaluate((selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el?.textContent) return el.textContent.trim();
      }
      return null;
    }, COMMENT_SELECTORS);

    const likes = parseInt0(likesText);
    const comments = parseInt0(commentsText);

    const sb = requireAdmin();
    await sb.from("post_engagement_snapshots").insert({
      post_id,
      platform: "note",
      hours_since_post: hoursSincePost,
      likes,
      comments,
      source: "scrape",
    });
  } finally {
    await browser.close();
  }
}
