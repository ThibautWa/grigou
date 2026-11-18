// Shared between the server (inline <head> script) and the client (ThemeProvider).
export const THEME_STORAGE_KEY = 'grigou-theme';

/** Applies the theme before the first paint (no flash of the wrong theme). */
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var d=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='dark';}})();`;
