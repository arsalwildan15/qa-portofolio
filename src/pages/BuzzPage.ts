import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Buzz is OrangeHRM's internal social feed: employees post text/photo/video
 * updates visible to EVERY employee in the company (not scoped to admin or
 * a single team), and can like/comment/share each other's posts. Because
 * content here is broadcast company-wide, validation gaps (XSS, unrestricted
 * file upload) have a wider blast radius than an admin-only screen -- any
 * employee viewing the feed is a potential victim, not just an admin.
 */
export class BuzzPage extends BasePage {
  readonly postComposerTrigger: Locator;
  readonly postTextarea: Locator;
  readonly sharePhotoButton: Locator;
  readonly shareVideoButton: Locator;
  readonly fileInput: Locator;
  readonly videoUrlInput: Locator;
  readonly submitPostButton: Locator;
  readonly postCards: Locator;
  readonly mostLikedTab: Locator;
  readonly mostCommentedTab: Locator;
  readonly mostRecentTab: Locator;

  constructor(page: Page) {
    super(page);
    this.postComposerTrigger = page.getByRole('button', { name: /post/i }).first();
    this.postTextarea = page.locator('textarea').first();
    this.sharePhotoButton = page.getByText(/share photo/i).first();
    this.shareVideoButton = page.getByText(/share video/i).first();
    this.fileInput = page.locator('input[type="file"]');
    this.videoUrlInput = page.getByPlaceholder(/paste video url/i);
    this.submitPostButton = page.getByRole('button', { name: /^post$/i }).last();
    // NOTE: '.orangehrm-buzz-post' only matches the post HEADER div (name/avatar/timestamp).
    // The body text, like/comment/share controls, and stats row live in sibling elements
    // under this wrapper -- confirmed via live DOM inspection 2026-11-11.
    this.postCards = page.locator('.oxd-sheet.orangehrm-buzz');
    this.mostRecentTab = page.getByRole('button', { name: /most recent posts/i });
    this.mostLikedTab = page.getByRole('button', { name: /most liked posts/i });
    this.mostCommentedTab = page.getByRole('button', { name: /most commented posts/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/buzz/viewBuzz');
  }

  async openComposer(): Promise<void> {
    await this.postComposerTrigger.click();
  }

  /**
   * Types text into the open composer and clicks the submit "Post" button, returning the
   * create-post API response. `timeoutMs` defaults to 15s for plain text posts but should be
   * widened (e.g. 30s) when a photo/file was attached first -- uploading binary data on the
   * shared public demo can take noticeably longer than a plain text-only submit.
   */
  async submitTextPost(text: string, timeoutMs = 15_000) {
    await this.postTextarea.fill(text);
    const [resp] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/api/v2/buzz/posts') && r.request().method() === 'POST',
        { timeout: timeoutMs },
      ),
      this.submitPostButton.click(),
    ]);
    return resp;
  }

  /** Reveals the file input by clicking "Share Photo" (it isn't in the DOM until this is clicked). */
  async revealPhotoUpload(): Promise<void> {
    await this.sharePhotoButton.click();
  }

  async revealVideoUpload(): Promise<void> {
    await this.shareVideoButton.click();
  }

  /**
   * "Share Video" in the composer is a URL field ("Paste Video URL"), NOT a file
   * upload -- confirmed by direct observation 2026-11-11 (screenshot showed a
   * text input + "Share" button, no <input type=file>). Submits the dialog's
   * own "Share" button (distinct from the text-post composer's "Post" button).
   */
  async submitVideoUrl(url: string) {
    await this.videoUrlInput.fill(url);
    const shareButton = this.page.getByRole('button', { name: /^share$/i });
    const [resp] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/api/v2/buzz/posts') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ).catch(() => null),
      shareButton.click(),
    ]);
    return resp;
  }

  /** Locates the post card whose body text matches `marker` (a unique string this test created). */
  cardByText(marker: string): Locator {
    return this.postCards.filter({ hasText: marker });
  }

  /**
   * A freshly-submitted post does NOT appear in the feed via client-side state update --
   * confirmed by direct observation 2026-11-11: polling cardByText() for 9s post-submit
   * without a reload never finds it, even though the API call returns 200 and the post
   * exists server-side. A full page reload is required to see your own new post. This is
   * a real app UX finding (not a script bug), documented in docs/Bug-List.xlsx.
   */
  async reloadAndFindCard(marker: string, timeoutMs = 15_000): Promise<Locator> {
    await this.page.reload();
    const card = this.cardByText(marker).first();
    await card.waitFor({ state: 'visible', timeout: timeoutMs });
    return card;
  }

  likeControl(card: Locator): Locator {
    return card.locator('svg.orangehrm-heart-icon, .orangehrm-heart-icon-circle').first();
  }

  commentIconButton(card: Locator): Locator {
    return card.locator('button:has(i.bi-chat-text-fill)');
  }

  /**
   * The inline comment box has no `type` attribute at all (plain `<input placeholder="Write
   * your comment...">`), so a CSS `input[type="text"]` selector never matches it -- confirmed
   * via live DOM inspection 2026-11-11. Scoped to `card` because this box is injected inside
   * the specific card whose comment icon was clicked, not globally.
   */
  commentInputFor(card: Locator): Locator {
    return card.getByPlaceholder(/write your comment/i);
  }

  kebabMenuButton(card: Locator): Locator {
    return card.locator('button:has(i.bi-three-dots)');
  }

  /** Menu items ("Delete Post" / "Edit Post") revealed after clicking the kebab menu -- confirmed via live DOM inspection 2026-11-11. */
  kebabMenuItem(label: 'Delete Post' | 'Edit Post'): Locator {
    return this.page.locator('.orangehrm-buzz-post-header-config-item', { hasText: label });
  }

  shareButton(card: Locator): Locator {
    return card.locator('button:has(i.bi-share-fill)');
  }

  /**
   * Clicking the share icon opens a "Share Post" modal (own composer-like dialog with an
   * optional comment + a dedicated "Share" button) -- confirmed via screenshot 2026-11-11.
   * This reposts the content to the sharer's own feed and increments the original post's
   * Shares counter.
   */
  async submitShare(comment = '') {
    const shareDialogButton = this.page.getByRole('button', { name: /^share$/i });
    if (comment) {
      await this.page.locator('textarea, input').last().fill(comment).catch(() => {});
    }
    await shareDialogButton.click();
  }

  /** "N Likes" / "N Comments" / "N Shares" text block under a post. */
  statsText(card: Locator): Locator {
    return card.locator('.orangehrm-buzz-stats-row');
  }
}
