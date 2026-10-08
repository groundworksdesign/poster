import {
  clearPresentShortcutPointerTarget,
  notePresentShortcutPointerTarget,
  shouldIgnorePresentShortcuts,
} from './presentShortcutGuard';

describe('shouldIgnorePresentShortcuts (REQ-026 / N1)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    clearPresentShortcutPointerTarget();
  });

  it('ignores typing fields', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    expect(shouldIgnorePresentShortcuts(input)).toBe(true);
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    expect(shouldIgnorePresentShortcuts(ta)).toBe(true);
    const select = document.createElement('select');
    document.body.appendChild(select);
    expect(shouldIgnorePresentShortcuts(select)).toBe(true);
  });

  it('ignores focus inside the slide edit panel', () => {
    document.body.innerHTML = `
      <div data-testid="deck-slide-editor-panel">
        <button type="button" id="in-panel">Save</button>
      </div>
    `;
    const btn = document.getElementById('in-panel');
    expect(shouldIgnorePresentShortcuts(btn)).toBe(true);
  });

  it('ignores focus inside the song/slide list', () => {
    document.body.innerHTML = `
      <div data-testid="deck-slides-list">
        <button type="button" id="edit-slide">Edit</button>
      </div>
    `;
    expect(shouldIgnorePresentShortcuts(document.getElementById('edit-slide'))).toBe(true);
  });

  it('allows Present shortcuts when focus is outside list and editor', () => {
    document.body.innerHTML = `
      <div data-testid="deck-slides-list"><button type="button">Edit</button></div>
      <div data-testid="deck-slide-editor-panel"><button type="button">Save</button></div>
      <button type="button" id="outside">Open Present</button>
    `;
    expect(shouldIgnorePresentShortcuts(document.getElementById('outside'))).toBe(false);
  });

  it('N1: ignores after pointerdown on non-focusable panel background even if activeElement is body', () => {
    document.body.innerHTML = `
      <div data-testid="deck-slide-editor-panel">
        <p id="panel-bg">panel chrome</p>
      </div>
    `;
    const bg = document.getElementById('panel-bg');
    notePresentShortcutPointerTarget(bg);
    // Simulate focus leaving the panel (click on non-focusable text).
    expect(shouldIgnorePresentShortcuts(document.body)).toBe(true);
  });

  it('N1: ignores after pointerdown on non-focusable slide-row text', () => {
    document.body.innerHTML = `
      <div data-testid="deck-slides-list">
        <span id="row-title">Amazing Grace</span>
      </div>
    `;
    notePresentShortcutPointerTarget(document.getElementById('row-title'));
    expect(shouldIgnorePresentShortcuts(document.body)).toBe(true);
  });

  it('N1: click outside clears the deck-ui latch', () => {
    document.body.innerHTML = `
      <div data-testid="deck-slide-editor-panel"><p id="panel-bg">x</p></div>
      <button type="button" id="outside">Open Present</button>
    `;
    notePresentShortcutPointerTarget(document.getElementById('panel-bg'));
    notePresentShortcutPointerTarget(document.getElementById('outside'));
    expect(shouldIgnorePresentShortcuts(document.getElementById('outside'))).toBe(false);
  });
});
