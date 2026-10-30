import { describe, expect, it } from 'vitest';
import {
  calculateContrastRatio,
  runFullContrastAudit,
  TOKEN_ADJUSTMENTS,
} from './contrast-audit';

describe('SAMAY Design System WCAG 2.1 AA Programmatic Contrast Audit', () => {
  it('identifies and fixes the 2 light-theme derived tokens that originally failed 4.5:1', () => {
    expect(TOKEN_ADJUSTMENTS).toHaveLength(2);

    // Verify original #C98A0B failed on light surface
    expect(calculateContrastRatio('#C98A0B', '#F7F1EB')).toBeLessThan(4.5);
    // Verify adjusted #8A5C04 passes >= 4.5 on all 3 light surfaces
    expect(calculateContrastRatio('#8A5C04', '#F7F1EB')).toBeGreaterThanOrEqual(4.5);
    expect(calculateContrastRatio('#8A5C04', '#FDFAF6')).toBeGreaterThanOrEqual(4.5);
    expect(calculateContrastRatio('#8A5C04', '#EFE3D8')).toBeGreaterThanOrEqual(4.5);

    // Verify original #5B6B7A failed on light surface-sunken (#EFE3D8)
    expect(calculateContrastRatio('#5B6B7A', '#EFE3D8')).toBeLessThan(4.5);
    // Verify adjusted #536270 passes >= 4.5 on all 3 light surfaces
    expect(calculateContrastRatio('#536270', '#F7F1EB')).toBeGreaterThanOrEqual(4.5);
    expect(calculateContrastRatio('#536270', '#FDFAF6')).toBeGreaterThanOrEqual(4.5);
    expect(calculateContrastRatio('#536270', '#EFE3D8')).toBeGreaterThanOrEqual(4.5);
  });

  it('passes WCAG 2.1 AA (>= 4.5:1) for every text-on-surface pairing across both Light and Dark themes', () => {
    const entries = runFullContrastAudit();
    expect(entries.length).toBe(68); // (11 fg * 3 surfaces + 1 on-brand) * 2 themes

    const failures = entries.filter((e) => !e.passesAA);
    expect(failures).toEqual([]);
  });
});

