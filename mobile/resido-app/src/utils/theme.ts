/**
 * Resido brand palette — soft off-white surface with violet accents.
 * Mirrors the visual language of the MySpace home: lavender-tinted background,
 * violet primary, deep-violet text, muted purple-gray secondary text.
 */
export const getThemeColors = (tenantId?: string) => {
    return {
        primary: '#8b5cf6',          // Violet — primary accent / CTA
        primarySoft: '#A084CA',      // Softer violet — secondary accent
        accent: '#c084fc',           // Lavender highlight
        background: '#F8F5FF',       // Off-white with lavender tint
        surface: '#ffffff',          // Pure white card surface
        surfaceMuted: '#E8E2F2',     // Soft lavender card
        border: '#D4C9E8',           // Light violet border
        borderSoft: '#EFE9F8',       // Very light violet divider
        textPrimary: '#2D2445',      // Deep violet — headings
        textMuted: '#7A6B9C',        // Muted purple-gray — subtext
        textFaint: '#9A8EBA',        // Faint purple — captions
    };
};

export const VIOLET_PALETTE = {
    primary: '#8b5cf6',
    primarySoft: '#A084CA',
    accent: '#c084fc',
    background: '#F8F5FF',
    surface: '#ffffff',
    surfaceMuted: '#E8E2F2',
    border: '#D4C9E8',
    borderSoft: '#EFE9F8',
    textPrimary: '#2D2445',
    textMuted: '#7A6B9C',
    textFaint: '#9A8EBA',
} as const;
