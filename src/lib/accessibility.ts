/**
 * Accessibility utilities for AgentPack.
 *
 * Helpers for ARIA attributes, focus management, screen reader
 * announcements, and WCAG 2.1 AA compliance.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/
 */

// ────────────────────────────────────────────────
// Unique ID generation (SSR-safe)
// ────────────────────────────────────────────────

let _idCounter = 0

/**
 * Generate a unique, SSR-safe ID for ARIA relationships.
 * Prefix hints at the element type (e.g. "dialog", "label", "desc").
 *
 * @example
 * const id = uniqueId('dialog') // "dialog-1"
 */
export function uniqueId(prefix = 'ap'): string {
  return `${prefix}-${++_idCounter}`
}

// ────────────────────────────────────────────────
// Screen-reader-only announcements
// ────────────────────────────────────────────────

/**
 * Announce a message to screen readers via a live region.
 * Creates (or reuses) a dedicated `aria-live` container.
 *
 * @param message - Text to announce
 * @param priority - "polite" (default) waits for current speech to end;
 *                   "assertive" interrupts immediately
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return

  const id = `a11y-live-region-${priority}`
  let region = document.getElementById(id)

  if (!region) {
    region = document.createElement('div')
    region.id = id
    region.setAttribute('role', 'status')
    region.setAttribute('aria-live', priority)
    region.setAttribute('aria-atomic', 'true')
    // Visually hidden but available to AT
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      borderWidth: '0',
    } as CSSStyleDeclaration)
    document.body.appendChild(region)
  }

  // Force re-announcement even if the message is the same as before.
  // Clearing + micro-delay ensures the live region fires again.
  region.textContent = ''
  requestAnimationFrame(() => {
    region!.textContent = message
  })
}

// ────────────────────────────────────────────────
// Focus management
// ────────────────────────────────────────────────

/** Selector for all focusable elements (keyboard-navigable). */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details',
  'summary',
  '[contenteditable]',
  'audio[controls]',
  'video[controls]',
].join(', ')

/**
 * Return all keyboard-focusable elements within a container.
 * Preserves DOM order.
 */
export function getFocusableElements(
  container: HTMLElement,
  includeContainer = false,
): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !isFocusGuarded(el),
  )

  if (includeContainer && container.matches(FOCUSABLE_SELECTOR)) {
    elements.unshift(container)
  }

  return elements
}

/**
 * Check whether an element is visually / programmatically hidden and thus
 * should not participate in focus order.
 */
function isFocusGuarded(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled')) return true
  if (el.getAttribute('aria-hidden') === 'true') return true
  if (el.getAttribute('tabindex') === '-1') return true

  // Check visibility via computed style
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return true
  }

  return false
}

/**
 * Move focus to the first focusable element inside a container.
 * Returns `true` if focus was moved, `false` if no focusable target exists.
 */
export function focusFirstElement(container: HTMLElement): boolean {
  const elements = getFocusableElements(container)
  if (elements.length > 0) {
    elements[0].focus()
    return true
  }
  return false
}

/**
 * Restore focus to a previously-focused element.
 * Commonly used when a modal / overlay closes.
 */
export function restoreFocus(previousElement: HTMLElement | null): void {
  if (previousElement && typeof previousElement.focus === 'function') {
    // Verify the element is still in the DOM and focusable
    if (document.body.contains(previousElement)) {
      previousElement.focus()
    }
  }
}
