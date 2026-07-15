import { Theme } from '../types';

export const THEMES: Theme[] = [
  {
    id: 'zen-charcoal',
    name: 'Professional Polish (Default) 💎',
    background: '#09090B',
    foreground: '#E4E4E7',
    cursor: '#4ADE80', // Emerald-green terminal accent
    accent: '#38BDF8', // Sky blue
    red: '#FF5F56',
    green: '#27C93F',
    yellow: '#FFBD2E',
    blue: '#38BDF8',
    magenta: '#EC4899',
    cyan: '#38BDF8',
    white: '#F4F4F5',
    glow: false,
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    isDark: true,
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night 🌌',
    background: '#1a1b26',
    foreground: '#a9b1d6',
    cursor: '#73daca', // Cyan-teal
    accent: '#7aa2f7', // Cool blue
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#c0caf5',
    glow: true,
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    isDark: true,
  },
  {
    id: 'dracula',
    name: 'Dracula Vampire 🧛',
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#50fa7b', // Poison green
    accent: '#bd93f9', // Purple
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#6272a4',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    glow: true,
    fontFamily: '"Fira Code", "JetBrains Mono", monospace',
    isDark: true,
  },
  {
    id: 'sakura-zen',
    name: 'Sakura Zen 🌸',
    background: '#FFF0F5', // Lavender Blush
    foreground: '#2F4F4F', // Dark Slate Gray
    cursor: '#FF69B4', // Hot pink
    accent: '#FFB6C1', // Light pink
    red: '#CD5C5C',
    green: '#6B8E23',
    yellow: '#D2691E',
    blue: '#4682B4',
    magenta: '#C71585',
    cyan: '#20B2AA',
    white: '#FFF8DC',
    glow: false,
    fontFamily: '"Inter", "JetBrains Mono", sans-serif',
    isDark: false,
  },
  {
    id: 'matrix',
    name: 'Matrix Digital 📟',
    background: '#030303',
    foreground: '#00FF41', // Matrix green
    cursor: '#00FF41',
    accent: '#008F11',
    red: '#FF0000',
    green: '#00FF41',
    yellow: '#FFFF00',
    blue: '#0000FF',
    magenta: '#FF00FF',
    cyan: '#00FFFF',
    white: '#FFFFFF',
    glow: true,
    fontFamily: '"Fira Code", ui-monospace, monospace',
    isDark: true,
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon ⚡',
    background: '#130c25',
    foreground: '#00f0ff', // Cyan
    cursor: '#f000ff', // Hot Magenta
    accent: '#ffe600', // Yellow
    red: '#ff0055',
    green: '#00ff66',
    yellow: '#ffe600',
    blue: '#00f0ff',
    magenta: '#f000ff',
    cyan: '#00f0ff',
    white: '#ffffff',
    glow: true,
    fontFamily: '"Fira Code", ui-monospace, monospace',
    isDark: true,
  },
  {
    id: 'nord',
    name: 'Nordic Frost ❄️',
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#88c0d0', // Frost blue
    accent: '#81a1c1',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#8fbcbb',
    white: '#eceff4',
    glow: false,
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    isDark: true,
  },
  {
    id: 'monokai',
    name: 'Monokai Pro 🎨',
    background: '#2d2a2e',
    foreground: '#fcfcfa',
    cursor: '#ffd866', // Soft gold
    accent: '#a9dc76', // Soft green
    red: '#ff6188',
    green: '#a9dc76',
    yellow: '#ffd866',
    blue: '#78dce8',
    magenta: '#ab9df2',
    cyan: '#78dce8',
    white: '#fcfcfa',
    glow: false,
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    isDark: true,
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark ☀️',
    background: '#002b36',
    foreground: '#839496',
    cursor: '#b58900', // Gold
    accent: '#2aa198', // Cyan
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    glow: false,
    fontFamily: '"Fira Code", "JetBrains Mono", monospace',
    isDark: true,
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light 📖',
    background: '#fdf6e3',
    foreground: '#586e75',
    cursor: '#b58900',
    accent: '#2aa198',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#073642',
    glow: false,
    fontFamily: '"Fira Code", "JetBrains Mono", monospace',
    isDark: false,
  },
];

const THEME_STORAGE_KEY = 'zenterm_active_theme_v2';
const CUSTOM_THEMES_KEY = 'zenterm_custom_themes_v2';

export function loadActiveTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      const themes = loadAllThemes();
      const found = themes.find(t => t.id === saved);
      if (found) return found;
    }
  } catch (e) {
    console.error('Failed to load active theme', e);
  }
  return THEMES[0]; // Return default Zen Charcoal
}

export function saveActiveTheme(themeId: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (e) {
    console.error('Failed to save active theme', e);
  }
}

export function loadAllThemes(): Theme[] {
  try {
    const custom = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (custom) {
      return [...THEMES, ...JSON.parse(custom)];
    }
  } catch (e) {
    console.error('Failed to load custom themes', e);
  }
  return THEMES;
}

export function saveCustomTheme(theme: Theme): void {
  try {
    const custom = localStorage.getItem(CUSTOM_THEMES_KEY);
    let list: Theme[] = [];
    if (custom) {
      list = JSON.parse(custom);
    }
    // Remove if exists
    list = list.filter(t => t.id !== theme.id);
    list.push(theme);
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save custom theme', e);
  }
}
