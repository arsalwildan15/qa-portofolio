import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Organization > Structure. Confirmed live:
 * /admin/viewCompanyStructure.
 *
 * UNLIKE every other Admin sub-screen in this suite, this is a genuine
 * HIERARCHICAL TREE (OXD `oxd-tree-view` component, an actual org chart),
 * not a flat Add/Edit/Delete list — confirmed live via DOM inspection
 * (`<ul class="oxd-tree-view">` with nested `<li class="oxd-tree-node">`
 * per sub-unit) and via the API: GET /api/v2/admin/subunits?mode=tree.
 *
 * Root node = the company itself ("OrangeHRM", same name shown/edited on
 * General Information) — it is NOT edited/deleted here, it only gets an
 * "Add" button (to add a direct child sub-unit) once selected.
 *
 * [TEMUAN PENTING] All CRUD actions are gated behind an "Edit" TOGGLE
 * SWITCH next to the heading (an `oxd-switch`, same pattern as General
 * Information, not a checkbox like Users' Status). With Edit mode off,
 * no Add/Edit/Delete icon is visible or interactable on any node. With it
 * on:
 *   - The root node's "Add" button (hidden via `display:none` otherwise)
 *     becomes visible once the root node's label is clicked (selected).
 *   - Every NON-root node shows a 3-icon action group directly, no
 *     per-node selection needed: trash (delete) THEN pencil (edit) THEN
 *     plus (add a child under this node) — confirmed live via innerHTML,
 *     delete-first same as every other list screen in this suite.
 *
 * Add/Edit open a MODAL dialog (same page, no URL change) titled "Add
 * Organization Unit" / equivalent for edit, with fields Unit Id, Name,
 * Description — ONLY Name is required (confirmed via a single "Required"
 * error on an empty submit). The dialog's helper text names the parent
 * ("This unit will be added under <parent>"). Buttons: Cancel, Save, and
 * a "×" close icon.
 *
 * API (confirmed live): POST /api/v2/admin/subunits (add, 200). Delete
 * goes through the same "Yes, Delete" confirmation dialog pattern used
 * project-wide.
 */
export class AdminStructurePage extends BasePage {
  readonly editToggle: Locator;
  readonly rootNodeLabel: Locator;
  readonly rootAddButton: Locator;
  readonly unitIdInput: Locator;
  readonly nameInput: Locator;
  readonly descriptionTextarea: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly nodeCards: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.editToggle = page.getByText('Edit', { exact: true }).first();
    this.rootNodeLabel = page.locator('.org-root-container .oxd-text--p', { hasText: 'OrangeHRM' });
    this.rootAddButton = page.locator('.org-structure-add');
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.unitIdInput = byLabel('Unit Id');
    this.nameInput = byLabel('Name');
    this.descriptionTextarea = page
      .locator('.oxd-input-group', { has: page.getByText('Description', { exact: true }) })
      .locator('textarea');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span, .oxd-text--span');
    this.nodeCards = page.locator('.org-structure-card');
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/viewCompanyStructure');
  }

  /** Turns the "Edit" switch on, revealing every node's action icons. */
  async enableEdit(): Promise<void> {
    await this.editToggle.click();
    await this.page.waitForTimeout(1000);
  }

  /** Selects the root node and clicks its "Add" button to add a direct child under the company. */
  async addUnderRoot(): Promise<void> {
    await this.rootNodeLabel.click();
    await this.page.waitForTimeout(500);
    await this.rootAddButton.click();
    await this.page.waitForTimeout(800);
  }

  nodeByName(name: string): Locator {
    return this.nodeCards.filter({ hasText: name });
  }

  /**
   * Expands a node's children by clicking its chevron toggle. Confirmed
   * live: a node that just received its first child does NOT auto-expand
   * — the child exists correctly in the tree API response (nested under
   * its parent) but stays visually collapsed until this toggle is
   * clicked, even right after a full page reload. The toggle button is a
   * SIBLING of the node's card inside the same `.oxd-tree-node-wrapper`
   * (not a descendant of the card), so it's reached via the nearest
   * `oxd-tree-node-wrapper` ancestor, not from the card downward.
   */
  async expandNode(node: Locator): Promise<void> {
    const wrapper = node.locator('xpath=ancestor::*[contains(@class,"oxd-tree-node-wrapper")][1]');
    await wrapper.locator('.oxd-tree-node-toggle button').first().click();
    await this.page.waitForTimeout(600);
  }

  /**
   * Action icons on a non-root node, in confirmed DOM order: [0]=delete,
   * [1]=edit, [2]=add child. `.org-action` is a direct child of the
   * `.org-structure-card` node itself (confirmed live via innerHTML) —
   * no need to go up to the parent first.
   */
  private actionIcons(node: Locator): Locator {
    return node.locator('.org-action button');
  }

  async deleteNode(node: Locator): Promise<void> {
    await this.actionIcons(node).nth(0).click();
    await this.page.waitForTimeout(500);
    await this.confirmDeleteButton.click();
  }

  async editNode(node: Locator): Promise<void> {
    await this.actionIcons(node).nth(1).click();
    await this.page.waitForTimeout(800);
  }

  async addChildUnder(node: Locator): Promise<void> {
    await this.actionIcons(node).nth(2).click();
    await this.page.waitForTimeout(800);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
