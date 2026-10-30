/**
 * Programmatic WCAG 2.1 AA Contrast Auditor for SAMAY Design System Tokens.
 * Evaluates every foreground token against every surface token in both Light and Dark themes.
 */

export interface TokenThemePalette {
  surfaces: {
    surface: string;
    'surface-raised': string;
    'surface-sunken': string;
  };
  foregrounds: {
    'text-primary': string;
    'text-muted': string;
    brand: string;
    'brand-hover': string;
    highlight: string;
    accent: string;
    'sla-on-track': string;
    'sla-due-soon': string;
    'sla-overdue': string;
    'sla-paused': string;
    info: string;
  };
  brandFill: {
    brand: string;
    'on-brand': string;
  };
}

export interface ContrastAuditEntry {
  theme: 'light' | 'dark';
  foregroundToken: string;
  foregroundHex: string;
  originalForegroundHex?: string;
  backgroundToken: string;
  backgroundHex: string;
  ratio: number;
  passesAA: boolean;
  wasAdjusted: boolean;
}

export interface TokenAdjustmentRecord {
  theme: 'light' | 'dark';
  token: string;
  originalHex: string;
  adjustedHex: string;
  reason: string;
  beforeRatios: { surface: number; raised: number; sunken: number };
  afterRatios: { surface: number; raised: number; sunken: number };
}

export const LIGHT_PALETTE: TokenThemePalette = {
  surfaces: {
    surface: '#F7F1EB',
    'surface-raised': '#FDFAF6',
    'surface-sunken': '#EFE3D8',
  },
  foregrounds: {
    'text-primary': '#131005',
    'text-muted': '#5E5644',
    brand: '#4F4315',
    'brand-hover': '#3D3410',
    highlight: '#804B05',
    accent: '#581301',
    'sla-on-track': '#2F6B4F',
    'sla-due-soon': '#8A5C04', // Fixed from #C98A0B (2.63:1 -> 5.19:1 on surface, 4.61:1 on sunken)
    'sla-overdue': '#B3261E',
    'sla-paused': '#536270',   // Fixed from #5B6B7A (4.35:1 -> 4.97:1 on sunken)
    info: '#2F5D7C',
  },
  brandFill: {
    brand: '#4F4315',
    'on-brand': '#F7F1EB',
  },
};

export const DARK_PALETTE: TokenThemePalette = {
  surfaces: {
    surface: '#17140A',
    'surface-raised': '#211C0E',
    'surface-sunken': '#100D06',
  },
  foregrounds: {
    'text-primary': '#F7F1EB',
    'text-muted': '#B9AE98',
    brand: '#BDA94F',
    'brand-hover': '#CDBB6C',
    highlight: '#D08A3A',
    accent: '#E0866B',
    'sla-on-track': '#5FB38A',
    'sla-due-soon': '#E5AE3A',
    'sla-overdue': '#F0766E',
    'sla-paused': '#9AA9B8',
    info: '#7FB0D3',
  },
  brandFill: {
    brand: '#BDA94F',
    'on-brand': '#131005',
  },
};

export function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '').trim();
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export const TOKEN_ADJUSTMENTS: TokenAdjustmentRecord[] = [
  {
    theme: 'light',
    token: '--sla-due-soon',
    originalHex: '#C98A0B',
    adjustedHex: '#8A5C04',
    reason:
      'Original #C98A0B failed WCAG 2.1 AA (4.5:1) against all 3 light surfaces (2.63:1 on surface, 2.83:1 on surface-raised, 2.34:1 on surface-sunken). Darkened to #8A5C04 so all light surfaces pass.',
    beforeRatios: {
      surface: calculateContrastRatio('#C98A0B', '#F7F1EB'),
      raised: calculateContrastRatio('#C98A0B', '#FDFAF6'),
      sunken: calculateContrastRatio('#C98A0B', '#EFE3D8'),
    },
    afterRatios: {
      surface: calculateContrastRatio('#8A5C04', '#F7F1EB'),
      raised: calculateContrastRatio('#8A5C04', '#FDFAF6'),
      sunken: calculateContrastRatio('#8A5C04', '#EFE3D8'),
    },
  },
  {
    theme: 'light',
    token: '--sla-paused',
    originalHex: '#5B6B7A',
    adjustedHex: '#536270',
    reason:
      'Original #5B6B7A achieved 4.89:1 on surface and 5.27:1 on surface-raised, but dipped to 4.35:1 (< 4.5:1) on surface-sunken (#EFE3D8). Adjusted to #536270 (4.97:1 on surface-sunken).',
    beforeRatios: {
      surface: calculateContrastRatio('#5B6B7A', '#F7F1EB'),
      raised: calculateContrastRatio('#5B6B7A', '#FDFAF6'),
      sunken: calculateContrastRatio('#5B6B7A', '#EFE3D8'),
    },
    afterRatios: {
      surface: calculateContrastRatio('#536270', '#F7F1EB'),
      raised: calculateContrastRatio('#536270', '#FDFAF6'),
      sunken: calculateContrastRatio('#536270', '#EFE3D8'),
    },
  },
];

export function runFullContrastAudit(): ContrastAuditEntry[] {
  const results: ContrastAuditEntry[] = [];

  const auditTheme = (theme: 'light' | 'dark', palette: TokenThemePalette) => {
    for (const [fgToken, fgHex] of Object.entries(palette.foregrounds)) {
      const adjustment = TOKEN_ADJUSTMENTS.find(
        (a) => a.theme === theme && a.token === `--${fgToken}`,
      );
      for (const [bgToken, bgHex] of Object.entries(palette.surfaces)) {
        const ratio = calculateContrastRatio(fgHex, bgHex);
        results.push({
          theme,
          foregroundToken: fgToken,
          foregroundHex: fgHex,
          originalForegroundHex: adjustment?.originalHex,
          backgroundToken: bgToken,
          backgroundHex: bgHex,
          ratio,
          passesAA: ratio >= 4.5,
          wasAdjusted: Boolean(adjustment),
        });
      }
    }

    // Also audit on-brand against brand fill
    const onBrandRatio = calculateContrastRatio(
      palette.brandFill['on-brand'],
      palette.brandFill.brand,
    );
    results.push({
      theme,
      foregroundToken: 'on-brand',
      foregroundHex: palette.brandFill['on-brand'],
      backgroundToken: 'brand',
      backgroundHex: palette.brandFill.brand,
      ratio: onBrandRatio,
      passesAA: onBrandRatio >= 4.5,
      wasAdjusted: false,
    });
  };

  auditTheme('light', LIGHT_PALETTE);
  auditTheme('dark', DARK_PALETTE);

  return results;
}

