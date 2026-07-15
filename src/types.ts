export interface VirtualFile {
  path: string; // Absolute path, e.g., "/welcome.txt"
  type: 'file' | 'directory';
  content?: string; // Content if it's a file
  updatedAt: string;
}

export interface VFileSystem {
  [path: string]: VirtualFile;
}

export interface Theme {
  id: string;
  name: string;
  background: string;
  foreground: string;
  cursor: string;
  accent: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  glow: boolean;
  fontFamily: string;
  isDark: boolean;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'accent';
  text: string;
  promptPrefix?: string;
}

export interface TerminalTab {
  id: string;
  title: string;
  shell: 'bash' | 'zsh';
  currentDir: string;
  history: string[]; // Command history
  historyIndex: number; // Index for scrolling history
  lines: TerminalLine[]; // Screen content
  isNanoActive: boolean;
  nanoFilename: string;
  nanoContent: string;
}
