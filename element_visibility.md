# Element Visibility Management

## Problem Statement

The codebase currently uses inconsistent patterns for managing element visibility across different components. This creates maintenance challenges and can lead to accessibility issues.

## Current Inconsistencies

### 1. Score Reveal Modal (`js/app.js`)
- Uses: `hidden` attribute + `aria-hidden` + `is-visible` CSS class
- Show: `hidden = false`, `aria-hidden = "false"`, add `is-visible` class
- Hide: Remove `is-visible` class, `aria-hidden = "true"`, then set `hidden = true` after 240ms

### 2. Instruction Placard (`js/app.js`)
- Uses: `data-hidden` attribute + `data-state` attribute
- Show: Remove `data-hidden` and `data-state` attributes
- Hide: Set `data-hidden = "true"`, remove `data-state`
- **Issue**: Custom attributes not standard, CSS must handle visibility

### 3. Performance HUD (`js/overlay.js`)
- Uses: Inline `style.display` property
- Show: `style.display = "block"`
- Hide: `style.display = "none"`
- **Issue**: No accessibility attributes, inline styles hard to override

### 4. ATS Webhook Panel (`js/invite.js`)
- Uses: `hidden` attribute only
- Show: `hidden = false`
- **Issue**: No aria attributes, no transition support

## Recommended Best Practices

### Standard Pattern for Modal/Overlay Elements

For modal overlays and important UI elements that need transitions:

```javascript
// Show
element.hidden = false;
element.setAttribute("aria-hidden", "false");
requestAnimationFrame(() => element.classList.add("is-visible"));

// Hide
element.classList.remove("is-visible");
element.setAttribute("aria-hidden", "true");
setTimeout(() => {
  element.hidden = true;
}, TRANSITION_DURATION_MS);
```

**Benefits:**
- `hidden` attribute provides semantic meaning and removes from accessibility tree
- `aria-hidden` provides explicit accessibility control
- CSS class enables transitions
- `requestAnimationFrame` ensures CSS transition triggers

### Standard Pattern for Simple Toggle Elements

For elements that don't need transitions (immediate show/hide):

```javascript
// Show
element.hidden = false;
element.setAttribute("aria-hidden", "false");

// Hide
element.hidden = true;
element.setAttribute("aria-hidden", "true");
```

### Avoid These Patterns

1. **Custom data attributes for visibility** (`data-hidden`) - Use standard `hidden` attribute
2. **Inline style.display** - Use `hidden` attribute or CSS classes
3. **Missing aria attributes** - Always set `aria-hidden` for consistency

## Implementation Guidelines

### 1. Prioritize Accessibility
- Always set both `hidden` and `aria-hidden` together
- Ensure keyboard navigation works (focus management)
- Test with screen readers

### 2. Support Transitions
- Use CSS classes (`is-visible`, `is-showing`) for animated elements
- Use `requestAnimationFrame` before adding "visible" class
- Delay setting `hidden=true` until after transition completes

### 3. Be Consistent
- Use the same pattern for similar UI elements
- Document deviations with clear comments
- Consider extracting to utility functions

## Proposed Utility Functions

```javascript
// In utils.js

/**
 * Show an element with optional transition support
 * @param {HTMLElement} element - Element to show
 * @param {Object} options - Configuration options
 * @param {boolean} options.transition - Whether to use CSS transition (default: false)
 * @param {string} options.visibleClass - CSS class to add (default: 'is-visible')
 */
export function showElement(element, options = {}) {
  if (!element) return;
  const { transition = false, visibleClass = 'is-visible' } = options;
  
  element.hidden = false;
  element.setAttribute('aria-hidden', 'false');
  
  if (transition) {
    requestAnimationFrame(() => element.classList.add(visibleClass));
  }
}

/**
 * Hide an element with optional transition support
 * @param {HTMLElement} element - Element to hide
 * @param {Object} options - Configuration options
 * @param {boolean} options.transition - Whether to use CSS transition (default: false)
 * @param {string} options.visibleClass - CSS class to remove (default: 'is-visible')
 * @param {number} options.transitionDuration - Delay before setting hidden in ms (default: 240)
 */
export function hideElement(element, options = {}) {
  if (!element) return;
  const { 
    transition = false, 
    visibleClass = 'is-visible',
    transitionDuration = 240 
  } = options;
  
  if (transition) {
    element.classList.remove(visibleClass);
    element.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      element.hidden = true;
    }, transitionDuration);
  } else {
    element.hidden = true;
    element.setAttribute('aria-hidden', 'true');
  }
}
```

## Migration Plan

### Phase 1: Add Utility Functions
- Add `showElement` and `hideElement` to `utils.js`
- Add tests for utility functions

### Phase 2: Refactor Existing Code
1. Update Score Reveal Modal to use utility functions
2. Update Instruction Placard to use standard `hidden` attribute
3. Update Performance HUD to use `hidden` attribute
4. Update ATS Webhook Panel to include aria attributes

### Phase 3: Update Documentation
- Document the standard pattern in README
- Add JSDoc comments to utility functions
- Update code review guidelines

## Testing Checklist

- [ ] Verify transitions work smoothly
- [ ] Test with keyboard navigation (Tab, Escape)
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] Verify no layout shifts occur
- [ ] Check that hidden elements are truly hidden from tab order
- [ ] Validate aria-hidden is synchronized with hidden attribute
