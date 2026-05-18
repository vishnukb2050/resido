export const getThemeColors = (tenantId?: string) => {
    if (!tenantId) {
        // My Space - Black & Emerald Teal Theme
        return {
            primary: '#0d9488', // Deep Emerald Teal
            background: '#000000', // Pure Black
            surface: '#121212', // Very Dark Gray
            accent: '#2dd4bf' // Bright Teal
        };
    }

    // Hash tenantId to get a consistent color index
    let hash = 0;
    for (let i = 0; i < tenantId.length; i++) {
        hash = tenantId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // A curated list of community themes (vibrant but professional)
    const themes = [
        { primary: '#10b981', background: '#064e3b', surface: '#065f46', accent: '#34d399' }, // Green (Emerald)
        { primary: '#f59e0b', background: '#451a03', surface: '#78350f', accent: '#fbbf24' }, // Amber/Orange
        { primary: '#ec4899', background: '#500724', surface: '#831843', accent: '#f472b6' }, // Pink/Rose
        { primary: '#8b5cf6', background: '#2e1065', surface: '#4c1d95', accent: '#a78bfa' }, // Purple/Violet
        { primary: '#ef4444', background: '#450a0a', surface: '#7f1d1d', accent: '#f87171' }, // Red/Crimson
        { primary: '#06b6d4', background: '#083344', surface: '#164e63', accent: '#22d3ee' }, // Cyan/Teal
        { primary: '#84cc16', background: '#1a2e05', surface: '#365314', accent: '#a3e635' }, // Lime/Olive
        { primary: '#6366f1', background: '#1e1b4b', surface: '#312e81', accent: '#818cf8' }, // Indigo
        { primary: '#d946ef', background: '#4a044e', surface: '#701a75', accent: '#f0abfc' }, // Fuchsia
        { primary: '#0ea5e9', background: '#0c4a6e', surface: '#075985', accent: '#38bdf8' }, // Sky
    ];

    const index = Math.abs(hash) % themes.length;
    return themes[index];
};
