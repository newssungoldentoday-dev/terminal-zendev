import { VFileSystem, VirtualFile } from '../types';

export const INITIAL_FILESYSTEM: VFileSystem = {
  '/': {
    path: '/',
    type: 'directory',
    updatedAt: new Date().toISOString(),
  },
  '/welcome.md': {
    path: '/welcome.md',
    type: 'file',
    content: `# Welcome to ZenTerm 🌸

ZenTerm is a minimalist, distraction-free terminal emulator built for modern developers.

## ✨ Core Features
- **Multi-Tab Support**: Open, rename, and manage multiple terminals.
- **Shells**: Switch seamlessly between **Bash** and **Zsh** (with rich autosuggestions).
- **Themes**: Switch pre-configured themes (Zen Charcoal, Matrix, Sakura Zen) or configure styling.
- **Built-in Editor**: Run \`nano <filename>\` to launch our full-screen editor!
- **Code Runner**: Execute JS files directly with \`run <js-file>\` inside your terminal sandbox!
- **GPU Visuals**: Try the \`matrix\` command for a GPU-accelerated code rain visual effect, or toggle the **CRT Filter**!

## 🚀 Quick Start
- Type \`help\` to see a list of available shell commands.
- Type \`neofetch\` for system statistics.
- Type \`theme sakura\` to feel the spring breeze, or \`theme matrix\` for cyberpunk energy.
- Open a new tab using the '+' button above or type \`tab new\`.

Enjoy peace and speed in your terminal workspace!
`,
    updatedAt: new Date().toISOString(),
  },
  '/about.txt': {
    path: '/about.txt',
    type: 'file',
    content: `===========================================
                Z E N T E R M
===========================================
Version: 1.2.0 (Stable Release)
License: MIT
Developer: Google AI Studio

ZenTerm was created to address the friction of bloated modern terminals. By keeping latency to a hard zero and combining text editing with command execution, it offers the ultimate distraction-free workspace.

Crafted with React, Tailwind CSS, and Lucide icons.
`,
    updatedAt: new Date().toISOString(),
  },
  '/projects': {
    path: '/projects',
    type: 'directory',
    updatedAt: new Date().toISOString(),
  },
  '/projects/fibonacci.js': {
    path: '/projects/fibonacci.js',
    type: 'file',
    content: `// ZenTerm JavaScript Sandbox Runner Demo
// Run this file with: run projects/fibonacci.js

function getFibonacci(n) {
  const sequence = [0, 1];
  for (let i = 2; i < n; i++) {
    sequence.push(sequence[i - 1] + sequence[i - 2]);
  }
  return sequence.slice(0, n);
}

console.log("--- Calculating Fibonacci Numbers ---");
const count = 10;
const result = getFibonacci(count);
console.log("First " + count + " Fibonacci terms:");
console.log(result.join(" -> "));
console.log("-------------------------------------");
`,
    updatedAt: new Date().toISOString(),
  },
  '/projects/todo.md': {
    path: '/projects/todo.md',
    type: 'file',
    content: `# ZenTerm Launch Checklist 🎯

- [x] Create multi-tab architecture
- [x] Design beautiful retro themes
- [x] Support Bash and Zsh prompts
- [x] Implement in-terminal interactive 'nano' editor
- [x] Build safe sandbox code runner ('run')
- [x] Develop matrix green screen canvas effect
- [ ] Connect with git repository (simulated)
`,
    updatedAt: new Date().toISOString(),
  },
  '/notes': {
    path: '/notes',
    type: 'directory',
    updatedAt: new Date().toISOString(),
  },
  '/notes/quotes.txt': {
    path: '/notes/quotes.txt',
    type: 'file',
    content: `"Simplicity is the ultimate sophistication." — Leonardo da Vinci

"Programs must be written for people to read, and only incidentally for machines to execute." — Harold Abelson

"The computer is incredibly fast, accurate, and stupid. Man is unbelievably slow, sloppy, and brilliant. The combination of the two is powerful beyond calculation." — Leo Cherne
`,
    updatedAt: new Date().toISOString(),
  },
};

const STORAGE_KEY = 'zenterm_vfs_v2';

export function loadFileSystem(): VFileSystem {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load filesystem from localstorage', e);
  }
  saveFileSystem(INITIAL_FILESYSTEM);
  return INITIAL_FILESYSTEM;
}

export function saveFileSystem(fs: VFileSystem): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fs));
  } catch (e) {
    console.error('Failed to save filesystem to localstorage', e);
  }
}

// Helper to normalize path strings
export function normalizePath(path: string): string {
  let cleaned = path.trim().replace(/\/+/g, '/');
  if (cleaned.endsWith('/') && cleaned.length > 1) {
    cleaned = cleaned.slice(0, -1);
  }
  if (!cleaned.startsWith('/')) {
    cleaned = '/' + cleaned;
  }
  return cleaned;
}

// Resolves relative path based on the current directory
export function resolvePath(currentDir: string, targetPath: string): string {
  const trimmedTarget = targetPath.trim();
  
  if (!trimmedTarget || trimmedTarget === '.') {
    return currentDir;
  }

  // Handle Home directory symbol ~
  if (trimmedTarget === '~') {
    return '/';
  }
  
  let workingPath = trimmedTarget;
  if (trimmedTarget.startsWith('~/')) {
    workingPath = '/' + trimmedTarget.slice(2);
  } else if (!trimmedTarget.startsWith('/')) {
    // Relative path
    workingPath = currentDir === '/' ? `/${trimmedTarget}` : `${currentDir}/${trimmedTarget}`;
  }

  const parts = workingPath.split('/');
  const stack: string[] = [];

  for (const part of parts) {
    if (part === '' || part === '.') {
      continue;
    }
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  const resolved = '/' + stack.join('/');
  return normalizePath(resolved);
}

// Get immediate children of a directory
export function listDirectory(fs: VFileSystem, dirPath: string): VirtualFile[] {
  const normalizedDir = normalizePath(dirPath);
  
  // Verify directory exists
  if (normalizedDir !== '/' && (!fs[normalizedDir] || fs[normalizedDir].type !== 'directory')) {
    return [];
  }

  const children: VirtualFile[] = [];
  const dirKeys = Object.keys(fs);

  for (const key of dirKeys) {
    if (key === normalizedDir || key === '/') continue;

    // Check if key starts with normalizedDir
    const prefix = normalizedDir === '/' ? '/' : normalizedDir + '/';
    if (key.startsWith(prefix)) {
      const remaining = key.slice(prefix.length);
      // Ensure it is an immediate child (no more slashes in remaining path)
      if (!remaining.includes('/')) {
        children.push(fs[key]);
      }
    }
  }

  return children.sort((a, b) => {
    // Directories first, then alphabetical files
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.path.localeCompare(b.path);
  });
}

// Create a directory
export function makeDirectory(fs: VFileSystem, path: string): { success: boolean; error?: string } {
  const norm = normalizePath(path);
  if (fs[norm]) {
    return { success: false, error: `File or directory already exists at: ${norm}` };
  }

  // Check if parent directory exists
  const parentPath = norm.substring(0, norm.lastIndexOf('/')) || '/';
  if (parentPath !== '/' && (!fs[parentPath] || fs[parentPath].type !== 'directory')) {
    return { success: false, error: `Parent directory does not exist: ${parentPath}` };
  }

  const updatedFs = {
    ...fs,
    [norm]: {
      path: norm,
      type: 'directory' as const,
      updatedAt: new Date().toISOString(),
    },
  };
  
  saveFileSystem(updatedFs);
  return { success: true };
}

// Write to file (create or overwrite)
export function writeTextFile(fs: VFileSystem, path: string, content: string): { success: boolean; error?: string } {
  const norm = normalizePath(path);
  if (fs[norm] && fs[norm].type === 'directory') {
    return { success: false, error: `Cannot write to directory: ${norm}` };
  }

  // Check if parent directory exists
  const parentPath = norm.substring(0, norm.lastIndexOf('/')) || '/';
  if (parentPath !== '/' && (!fs[parentPath] || fs[parentPath].type !== 'directory')) {
    return { success: false, error: `Parent directory does not exist: ${parentPath}` };
  }

  const updatedFs = {
    ...fs,
    [norm]: {
      path: norm,
      type: 'file' as const,
      content,
      updatedAt: new Date().toISOString(),
    },
  };

  saveFileSystem(updatedFs);
  return { success: true };
}

// Delete file or folder (recursive)
export function removePath(fs: VFileSystem, path: string): { success: boolean; error?: string } {
  const norm = normalizePath(path);
  if (!fs[norm]) {
    return { success: false, error: `No such file or directory: ${norm}` };
  }

  if (norm === '/') {
    return { success: false, error: 'Cannot remove root directory' };
  }

  const updatedFs = { ...fs };

  if (updatedFs[norm].type === 'directory') {
    // Recursively delete all items under this prefix
    const prefix = norm + '/';
    const keysToDelete = Object.keys(updatedFs).filter(key => key.startsWith(prefix) || key === norm);
    for (const key of keysToDelete) {
      delete updatedFs[key];
    }
  } else {
    delete updatedFs[norm];
  }

  saveFileSystem(updatedFs);
  return { success: true };
}
