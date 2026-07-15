import React, { useState, useEffect, useRef } from 'react';
import { TerminalTab, Theme, VFileSystem, TerminalLine } from '../types';
import { listDirectory, resolvePath } from '../utils/fileSystem';
import { loadAllThemes } from '../utils/themes';
import { Sparkles, Terminal as TerminalIcon, AlertTriangle } from 'lucide-react';

interface TerminalProps {
  tab: TerminalTab;
  theme: Theme;
  fs: VFileSystem;
  username: string;
  onUpdateTab: (updatedTab: TerminalTab) => void;
  onFsChange: (newFs: VFileSystem) => void;
  onThemeChange: (themeId: string) => void;
  onTriggerMatrix: () => void;
  isMobile?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({
  tab,
  theme,
  fs,
  username,
  onUpdateTab,
  onFsChange,
  onThemeChange,
  onTriggerMatrix,
  isMobile = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isSnakeActive, setIsSnakeActive] = useState(false);
  const [snakeScore, setSnakeScore] = useState(0);
  const [snakeHighScore, setSnakeHighScore] = useState(() => {
    return Number(localStorage.getItem('zenterm_snake_highscore') || '0');
  });

  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const linesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    linesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tab.lines, isSnakeActive]);

  // Focus input on terminal body click
  const handleTerminalClick = () => {
    if (!isSnakeActive && inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    handleTerminalClick();
  }, [tab.id, isSnakeActive]);

  // Command autosuggestions (Zsh-style)
  useEffect(() => {
    if (tab.shell !== 'zsh' || !inputValue.trim()) {
      setSuggestion('');
      return;
    }

    // Find the first matching command in history
    const match = [...tab.history]
      .reverse()
      .find(cmd => cmd.startsWith(inputValue) && cmd !== inputValue);

    if (match) {
      setSuggestion(match);
    } else {
      // Check common commands as fallback suggestions
      const commonCommands = ['neofetch', 'help', 'clear', 'matrix', 'nano welcome.md', 'run projects/fibonacci.js', 'theme sakura-zen', 'theme tokyo-night'];
      const cmdMatch = commonCommands.find(cmd => cmd.startsWith(inputValue) && cmd !== inputValue);
      setSuggestion(cmdMatch || '');
    }
  }, [inputValue, tab.history, tab.shell]);

  // Handle command history navigation (Up / Down Arrow) and autocomplete (Right Arrow / Tab)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (tab.history.length === 0) return;
      
      const nextIndex = tab.historyIndex + 1;
      if (nextIndex <= tab.history.length) {
        const cmd = tab.history[tab.history.length - nextIndex];
        setInputValue(cmd);
        onUpdateTab({
          ...tab,
          historyIndex: nextIndex,
        });
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = tab.historyIndex - 1;
      if (nextIndex > 0) {
        const cmd = tab.history[tab.history.length - nextIndex];
        setInputValue(cmd);
        onUpdateTab({
          ...tab,
          historyIndex: nextIndex,
        });
      } else {
        setInputValue('');
        onUpdateTab({
          ...tab,
          historyIndex: 0,
        });
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Handle tab-completion of filenames/commands
      handleTabComplete();
    } else if (e.key === 'ArrowRight' || e.key === 'End') {
      // Accept Zsh Autosuggestion
      if (suggestion && inputValue !== suggestion) {
        setInputValue(suggestion);
      }
    }
  };

  const handleTabComplete = () => {
    const parts = inputValue.split(' ');
    const lastWord = parts[parts.length - 1];

    if (!lastWord) return;

    // Search command names if it's the first word
    if (parts.length === 1) {
      const commands = ['help', 'clear', 'pwd', 'cd', 'ls', 'cat', 'nano', 'edit', 'touch', 'mkdir', 'rm', 'whoami', 'date', 'neofetch', 'theme', 'matrix', 'run', 'snake'];
      const matches = commands.filter(c => c.startsWith(lastWord));
      if (matches.length === 1) {
        setInputValue(matches[0] + ' ');
      } else if (matches.length > 1) {
        // Log possible completions
        const matchLines: TerminalLine[] = [
          { id: Math.random().toString(), type: 'input', text: inputValue, promptPrefix: getPromptPrefix() },
          { id: Math.random().toString(), type: 'info', text: matches.join('  ') }
        ];
        onUpdateTab({
          ...tab,
          lines: [...tab.lines, ...matchLines]
        });
      }
    } else {
      // Search files/folders in current path
      const contents = listDirectory(fs, tab.currentDir);
      const matches = contents.filter(item => {
        const name = item.path.split('/').pop() || '';
        return name.startsWith(lastWord);
      });

      if (matches.length === 1) {
        const matchedName = matches[0].path.split('/').pop() || '';
        parts[parts.length - 1] = matchedName;
        setInputValue(parts.join(' ') + (matches[0].type === 'directory' ? '/' : ''));
      } else if (matches.length > 1) {
        const matchNames = matches.map(m => m.path.split('/').pop() || '');
        const matchLines: TerminalLine[] = [
          { id: Math.random().toString(), type: 'input', text: inputValue, promptPrefix: getPromptPrefix() },
          { id: Math.random().toString(), type: 'info', text: matchNames.join('  ') }
        ];
        onUpdateTab({
          ...tab,
          lines: [...tab.lines, ...matchLines]
        });
      }
    }
  };

  const executeCommand = (cmdStr: string) => {
    setInputValue('');
    setSuggestion('');

    // Reset history index
    const updatedHistory = cmdStr ? [...tab.history, cmdStr] : tab.history;
    const historyIndex = 0;

    const currentPrompt = getPromptPrefix();

    if (!cmdStr) {
      onUpdateTab({
        ...tab,
        history: updatedHistory,
        historyIndex,
        lines: [...tab.lines, { id: Math.random().toString(), type: 'input', text: '', promptPrefix: currentPrompt }]
      });
      return;
    }

    // Parse command arguments with quotes support
    const args = parseArguments(cmdStr);
    const commandName = args[0].toLowerCase();
    const commandArgs = args.slice(1);

    const inputLine: TerminalLine = {
      id: Math.random().toString(),
      type: 'input',
      text: cmdStr,
      promptPrefix: currentPrompt,
    };

    let outputLines: TerminalLine[] = [];

    switch (commandName) {
      case 'clear':
      case 'cls':
        onUpdateTab({
          ...tab,
          history: updatedHistory,
          historyIndex,
          lines: [],
        });
        return;

      case 'help':
        outputLines = getHelpOutput();
        break;

      case 'pwd':
        outputLines = [{ id: Math.random().toString(), type: 'output', text: tab.currentDir }];
        break;

      case 'whoami':
        outputLines = [{ id: Math.random().toString(), type: 'info', text: `${username} @ zenterm.host (Developer Profile)` }];
        break;

      case 'date':
        outputLines = [{ id: Math.random().toString(), type: 'output', text: new Date().toString() }];
        break;

      case 'neofetch':
      case 'sysinfo':
        outputLines = getNeofetchOutput();
        break;

      case 'theme':
        outputLines = handleThemeCommand(commandArgs);
        break;

      case 'cd':
        outputLines = handleCdCommand(commandArgs);
        break;

      case 'ls':
        outputLines = handleLsCommand(commandArgs);
        break;

      case 'cat':
        outputLines = handleCatCommand(commandArgs);
        break;

      case 'touch':
        outputLines = handleTouchCommand(commandArgs);
        break;

      case 'mkdir':
        outputLines = handleMkdirCommand(commandArgs);
        break;

      case 'rm':
        outputLines = handleRmCommand(commandArgs);
        break;

      case 'echo':
        outputLines = [{ id: Math.random().toString(), type: 'output', text: commandArgs.join(' ') }];
        break;

      case 'matrix':
        onTriggerMatrix();
        return;

      case 'snake':
      case 'game':
        setIsSnakeActive(true);
        setSnakeScore(0);
        onUpdateTab({
          ...tab,
          history: updatedHistory,
          historyIndex,
          lines: [...tab.lines, inputLine, { id: Math.random().toString(), type: 'success', text: 'Initializing Snake Game...' }]
        });
        return;

      case 'nano':
      case 'edit':
        outputLines = handleNanoCommand(commandArgs);
        if (tab.isNanoActive) {
          // If nano is successfully triggered, we append the input line but let App handle Nano view
          onUpdateTab({
            ...tab,
            history: updatedHistory,
            historyIndex,
            lines: [...tab.lines, inputLine]
          });
          return;
        }
        break;

      case 'run':
        outputLines = handleRunCommand(commandArgs);
        break;

      default:
        outputLines = [
          { 
            id: Math.random().toString(), 
            type: 'error', 
            text: `zenterm: command not found: ${commandName}. Type 'help' to view available commands.` 
          }
        ];
    }

    onUpdateTab({
      ...tab,
      history: updatedHistory,
      historyIndex,
      lines: [...tab.lines, inputLine, ...outputLines],
    });
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(inputValue);
  };

  const handleVirtualKeyPress = (key: string) => {
    if (key === 'Tab') {
      handleTabComplete();
    } else if (key === 'ArrowUp') {
      if (tab.history.length === 0) return;
      const nextIndex = tab.historyIndex + 1;
      if (nextIndex <= tab.history.length) {
        const cmd = tab.history[tab.history.length - nextIndex];
        setInputValue(cmd);
        onUpdateTab({
          ...tab,
          historyIndex: nextIndex,
        });
      }
    } else if (key === 'ArrowDown') {
      const nextIndex = tab.historyIndex - 1;
      if (nextIndex > 0) {
        const cmd = tab.history[tab.history.length - nextIndex];
        setInputValue(cmd);
        onUpdateTab({
          ...tab,
          historyIndex: nextIndex,
        });
      } else {
        setInputValue('');
        onUpdateTab({
          ...tab,
          historyIndex: 0,
        });
      }
    } else if (key === 'Ctrl+C') {
      setInputValue('');
      setSuggestion('');
      onUpdateTab({
        ...tab,
        lines: [...tab.lines, { id: Math.random().toString(), type: 'input', text: '^C', promptPrefix: getPromptPrefix() }]
      });
    }
  };

  // Safe Javascript Sandbox Code Execution
  const handleRunCommand = (args: string[]): TerminalLine[] => {
    if (args.length === 0) {
      return [{ id: Math.random().toString(), type: 'error', text: 'Usage: run <javascript-file.js>' }];
    }

    const targetPath = resolvePath(tab.currentDir, args[0]);
    const fileNode = fs[targetPath];

    if (!fileNode) {
      return [{ id: Math.random().toString(), type: 'error', text: `run: no such file: ${args[0]}` }];
    }

    if (fileNode.type !== 'file') {
      return [{ id: Math.random().toString(), type: 'error', text: `run: ${args[0]} is a directory` }];
    }

    const outputs: string[] = [];
    const customConsole = {
      log: (...logArgs: any[]) => {
        outputs.push(logArgs.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
      },
      error: (...logArgs: any[]) => {
        outputs.push('[RUNTIME ERROR] ' + logArgs.join(' '));
      },
      warn: (...logArgs: any[]) => {
        outputs.push('[RUNTIME WARNING] ' + logArgs.join(' '));
      },
      clear: () => {}
    };

    try {
      // Execute file content inside sandboxed Function context
      const runner = new Function('console', fileNode.content || '');
      runner(customConsole);
      
      return [
        { id: Math.random().toString(), type: 'info', text: `>>> Executing ${targetPath} in sandboxed runtime...` },
        ...outputs.map(out => ({ id: Math.random().toString(), type: 'output' as const, text: out })),
        { id: Math.random().toString(), type: 'success', text: `>>> Execution finished successfully.` }
      ];
    } catch (err: any) {
      return [
        { id: Math.random().toString(), type: 'info', text: `>>> Executing ${targetPath} in sandboxed runtime...` },
        { id: Math.random().toString(), type: 'error', text: `Compilation/Runtime Error: ${err.message}` }
      ];
    }
  };

  const handleNanoCommand = (args: string[]): TerminalLine[] => {
    if (args.length === 0) {
      return [{ id: Math.random().toString(), type: 'error', text: 'Usage: nano <filename>  (e.g., nano projects/todo.md)' }];
    }

    const targetPath = resolvePath(tab.currentDir, args[0]);
    const fileNode = fs[targetPath];

    if (fileNode && fileNode.type === 'directory') {
      return [{ id: Math.random().toString(), type: 'error', text: `nano: ${args[0]} is a directory` }];
    }

    // Set tab nano state active to let App trigger the fullscreen editor
    tab.isNanoActive = true;
    tab.nanoFilename = targetPath;
    tab.nanoContent = fileNode ? (fileNode.content || '') : '';
    
    return [];
  };

  const handleCdCommand = (args: string[]): TerminalLine[] => {
    const target = args.length === 0 ? '~' : args[0];
    const targetPath = resolvePath(tab.currentDir, target);

    if (targetPath === '/') {
      tab.currentDir = '/';
      return [];
    }

    const node = fs[targetPath];
    if (!node) {
      return [{ id: Math.random().toString(), type: 'error', text: `cd: no such file or directory: ${target}` }];
    }

    if (node.type !== 'directory') {
      return [{ id: Math.random().toString(), type: 'error', text: `cd: not a directory: ${target}` }];
    }

    tab.currentDir = targetPath;
    return [];
  };

  const handleLsCommand = (args: string[]): TerminalLine[] => {
    let target = tab.currentDir;
    if (args.length > 0) {
      target = resolvePath(tab.currentDir, args[0]);
    }

    if (target !== '/' && (!fs[target] || fs[target].type !== 'directory')) {
      return [{ id: Math.random().toString(), type: 'error', text: `ls: cannot access '${args[0]}': No such directory` }];
    }

    const items = listDirectory(fs, target);
    if (items.length === 0) {
      return [];
    }

    // List files beautifully with custom spacing and colors based on type
    const renderedItems = items.map(item => {
      const name = item.path.split('/').pop() || '';
      if (item.type === 'directory') {
        return `\x1b[34m${name}/\x1b[0m`; // Simulated blue
      }
      if (name.endsWith('.js')) {
        return `\x1b[32m${name}*\x1b[0m`; // Simulated green (executable)
      }
      return name;
    }).join('    ');

    return [{ id: Math.random().toString(), type: 'output', text: renderedItems }];
  };

  const handleCatCommand = (args: string[]): TerminalLine[] => {
    if (args.length === 0) {
      return [{ id: Math.random().toString(), type: 'error', text: 'cat: missing file operand' }];
    }

    const targetPath = resolvePath(tab.currentDir, args[0]);
    const fileNode = fs[targetPath];

    if (!fileNode) {
      return [{ id: Math.random().toString(), type: 'error', text: `cat: ${args[0]}: No such file` }];
    }

    if (fileNode.type === 'directory') {
      return [{ id: Math.random().toString(), type: 'error', text: `cat: ${args[0]}: Is a directory` }];
    }

    const lines = (fileNode.content || '').split('\n');
    return lines.map(l => ({ id: Math.random().toString(), type: 'output' as const, text: l }));
  };

  const handleTouchCommand = (args: string[]): TerminalLine[] => {
    if (args.length === 0) {
      return [{ id: Math.random().toString(), type: 'error', text: 'touch: missing file operand' }];
    }

    const targetPath = resolvePath(tab.currentDir, args[0]);
    if (fs[targetPath]) {
      // Just update timestamp
      fs[targetPath].updatedAt = new Date().toISOString();
      onFsChange({ ...fs });
      return [];
    }

    fs[targetPath] = {
      path: targetPath,
      type: 'file',
      content: '',
      updatedAt: new Date().toISOString(),
    };

    onFsChange({ ...fs });
    return [{ id: Math.random().toString(), type: 'success', text: `Created blank file at ${targetPath}` }];
  };

  const handleMkdirCommand = (args: string[]): TerminalLine[] => {
    if (args.length === 0) {
      return [{ id: Math.random().toString(), type: 'error', text: 'mkdir: missing operand' }];
    }

    const targetPath = resolvePath(tab.currentDir, args[0]);
    if (fs[targetPath]) {
      return [{ id: Math.random().toString(), type: 'error', text: `mkdir: cannot create directory '${args[0]}': File exists` }];
    }

    fs[targetPath] = {
      path: targetPath,
      type: 'directory',
      updatedAt: new Date().toISOString(),
    };

    onFsChange({ ...fs });
    return [{ id: Math.random().toString(), type: 'success', text: `Created directory at ${targetPath}` }];
  };

  const handleRmCommand = (args: string[]): TerminalLine[] => {
    if (args.length === 0) {
      return [{ id: Math.random().toString(), type: 'error', text: 'rm: missing operand' }];
    }

    // Handle standard -rf recursive flags
    const isRecursive = args.includes('-rf') || args.includes('-r');
    const filename = args.filter(a => !a.startsWith('-'))[0];

    if (!filename) {
      return [{ id: Math.random().toString(), type: 'error', text: 'rm: missing operand' }];
    }

    const targetPath = resolvePath(tab.currentDir, filename);
    const node = fs[targetPath];

    if (!node) {
      return [{ id: Math.random().toString(), type: 'error', text: `rm: cannot remove '${filename}': No such file or directory` }];
    }

    if (node.type === 'directory' && !isRecursive) {
      return [{ id: Math.random().toString(), type: 'error', text: `rm: cannot remove '${filename}': Is a directory. Use 'rm -rf'` }];
    }

    if (targetPath === '/') {
      return [{ id: Math.random().toString(), type: 'error', text: 'rm: Permission denied: Cannot delete root' }];
    }

    // Perform VFS delete
    const updatedFs = { ...fs };
    if (node.type === 'directory') {
      const prefix = targetPath + '/';
      const keysToDelete = Object.keys(updatedFs).filter(key => key.startsWith(prefix) || key === targetPath);
      for (const k of keysToDelete) {
        delete updatedFs[k];
      }
    } else {
      delete updatedFs[targetPath];
    }

    onFsChange(updatedFs);
    return [{ id: Math.random().toString(), type: 'success', text: `Removed: ${filename}` }];
  };

  const handleThemeCommand = (args: string[]): TerminalLine[] => {
    const allThemes = loadAllThemes();

    if (args.length === 0) {
      const lines: TerminalLine[] = [
        { id: Math.random().toString(), type: 'info', text: '=== Available ZenTerm Themes ===' },
        ...allThemes.map(t => ({
          id: Math.random().toString(),
          type: 'output' as const,
          text: `• ${t.id.padEnd(20)} - ${t.name} ${t.id === theme.id ? '(Active)' : ''}`
        })),
        { id: Math.random().toString(), type: 'info', text: 'Usage: theme <theme-id>  (e.g., theme tokyo-night)' }
      ];
      return lines;
    }

    const requestedThemeId = args[0].toLowerCase();
    const found = allThemes.find(t => t.id === requestedThemeId);

    if (found) {
      onThemeChange(found.id);
      return [{ id: Math.random().toString(), type: 'success', text: `Theme successfully updated to: ${found.name}` }];
    } else {
      return [
        { id: Math.random().toString(), type: 'error', text: `Theme '${requestedThemeId}' not found.` },
        { id: Math.random().toString(), type: 'info', text: "Type 'theme' with no arguments to see the list of all valid themes." }
      ];
    }
  };

  const parseArguments = (input: string): string[] => {
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current) args.push(current);
    return args;
  };

  const getPromptPrefix = () => {
    const activeDirName = tab.currentDir === '/' ? '~' : tab.currentDir.replace(/^\/home\/user/, '~');
    if (tab.shell === 'bash') {
      return `${username}@zenterm:${activeDirName}$`;
    } else {
      const gitBranch = tab.currentDir.startsWith('/projects') ? ' git:(main)' : '';
      return `➜  ${activeDirName.replace('/', '') || '~'}${gitBranch} `;
    }
  };

  const getHelpOutput = (): TerminalLine[] => {
    const cmds = [
      { name: 'help', desc: 'Display this helpful manual' },
      { name: 'neofetch', desc: 'Print system diagnostic profile and ZenTerm logo' },
      { name: 'clear', desc: 'Wipe all historical commands from screen' },
      { name: 'ls [dir]', desc: 'List files and directories in current workspace path' },
      { name: 'cd <dir>', desc: 'Change workspace path' },
      { name: 'pwd', desc: 'Print absolute active path' },
      { name: 'cat <file>', desc: 'Dump text file content to screen' },
      { name: 'nano <file>', desc: 'Launch full-screen, interactive Zen Editor' },
      { name: 'touch <file>', desc: 'Create a blank text/script file' },
      { name: 'mkdir <dir>', desc: 'Create a new project directory' },
      { name: 'rm [-rf] <file>', desc: 'Delete file or folder recursive' },
      { name: 'echo <text>', desc: 'Echo message to console' },
      { name: 'theme <id>', desc: 'List or set color theme on the fly' },
      { name: 'matrix', desc: 'Trigger full-screen canvas glowing digital rain' },
      { name: 'run <file.js>', desc: 'Safely execute Javascript files in terminal sandbox' },
      { name: 'snake', desc: 'Play visual Retro Snake game in current tab' },
      { name: 'whoami', desc: 'Print developer user info' }
    ];

    return [
      { id: Math.random().toString(), type: 'info', text: '==================== ZenTerm Shell Commands ====================' },
      ...cmds.map(c => ({
        id: Math.random().toString(),
        type: 'output' as const,
        text: `  ${c.name.padEnd(16)} - ${c.desc}`
      })),
      { id: Math.random().toString(), type: 'info', text: '================================================================' },
    ];
  };

  const getNeofetchOutput = (): TerminalLine[] => {
    const fileCount = Object.keys(fs).length;
    const activeThemeName = theme.name;

    return [
      { id: Math.random().toString(), type: 'accent', text: '    _                 _                                ' },
      { id: Math.random().toString(), type: 'accent', text: '   (_)               | |                               ' },
      { id: Math.random().toString(), type: 'accent', text: '    _   ___ _ __  _ _| |_ ___ _ __ _ __ ___   ' },
      { id: Math.random().toString(), type: 'accent', text: "   | | / _ \\ '_ \\| __|  _/ _ \\ '__| '_ \x1b[32m_ `_ \\  \x1b[0m" + `  OS: ZenOS v1.2.0 (Simulated Virtual Kernel)` },
      { id: Math.random().toString(), type: 'accent', text: "   | ||  __/ | | | |_| ||  __/ |  | | | | | |  " + `  Host: Cloud Run Client Container` },
      { id: Math.random().toString(), type: 'accent', text: `  _/ | \\___|_| |_|\\__|_\\ \\___|_|  |_| |_| |_|  ` + `  Shell: ${tab.shell === 'bash' ? 'Bash 5.1 (Simulated)' : 'Zsh 5.8 (Simulated)'}` },
      { id: Math.random().toString(), type: 'accent', text: " |__/                                          " + `  Uptime: 10m` },
      { id: Math.random().toString(), type: 'output', text: `                                                Theme: ${activeThemeName}` },
      { id: Math.random().toString(), type: 'output', text: `                                                Display: GPU Accelerated Fluid Engine` },
      { id: Math.random().toString(), type: 'output', text: `                                                Filesystem VFS: ${fileCount} Nodes active` },
      { id: Math.random().toString(), type: 'output', text: `                                                Memory: JS Heap WASM Safe (2GB)` },
    ];
  };

  // ANSI styling translator for terminal output
  const renderLineText = (line: TerminalLine) => {
    const text = line.text;
    if (!text.includes('\x1b')) {
      return <span>{text}</span>;
    }

    // Simple parser for ANSI colors e.g. \x1b[34mText\x1b[0m
    const parts = text.split(/(\x1b\[\d+m|\x1b\[0m)/);
    let currentColorClass = '';

    return (
      <span>
        {parts.map((part, index) => {
          if (part.startsWith('\x1b[')) {
            const code = part.match(/\d+/)?.[0];
            if (code === '34') currentColorClass = 'text-blue-400 font-bold';
            else if (code === '32') currentColorClass = 'text-emerald-400 font-bold';
            else if (code === '31') currentColorClass = 'text-red-400 font-bold';
            else if (code === '33') currentColorClass = 'text-yellow-400 font-bold';
            else if (code === '35') currentColorClass = 'text-pink-400 font-bold';
            return null;
          } else if (part === '\x1b[0m') {
            currentColorClass = '';
            return null;
          }
          return <span key={index} className={currentColorClass}>{part}</span>;
        })}
      </span>
    );
  };

  // Snake Game Implementation
  const runSnakeGame = () => {
    return (
      <div className="flex flex-col items-center justify-center border border-zinc-800 bg-black/60 backdrop-blur rounded-lg p-6 max-w-md mx-auto my-4 select-none">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold font-sans text-emerald-400 text-lg uppercase tracking-wider">ZenSnake Retro Game</h3>
        </div>

        <SnakeGameContainer 
          onGameOver={(score) => {
            setSnakeScore(score);
            if (score > snakeHighScore) {
              setSnakeHighScore(score);
              localStorage.setItem('zenterm_snake_highscore', String(score));
            }
            setIsSnakeActive(false);
            
            // Log score back to terminal lines
            const gameLines: TerminalLine[] = [
              { id: Math.random().toString(), type: 'success', text: `Snake Game finished! Final Score: ${score}. High Score: ${Math.max(score, snakeHighScore)}` },
              { id: Math.random().toString(), type: 'info', text: "Type 'snake' to play again." }
            ];
            onUpdateTab({
              ...tab,
              lines: [...tab.lines, ...gameLines]
            });
          }}
          theme={theme}
          isMobile={isMobile}
        />
      </div>
    );
  };

  return (
    <div 
      ref={terminalBodyRef}
      onClick={handleTerminalClick}
      className="flex-1 flex flex-col p-4 overflow-y-auto cursor-text font-mono text-xs leading-relaxed select-text"
      style={{
        backgroundColor: theme.background,
        color: theme.foreground,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Historical lines */}
      <div className="flex flex-col gap-1">
        {tab.lines.map((line) => (
          <div key={line.id} className="whitespace-pre-wrap break-all min-h-[18px]">
            {line.type === 'input' && (
              <span className="mr-2 select-none" style={{ color: theme.cursor }}>
                {line.promptPrefix}
              </span>
            )}
            
            {/* Direct color mappings based on line types */}
            <span className={`
              ${line.type === 'error' ? 'text-red-400 font-bold' : ''}
              ${line.type === 'success' ? 'text-emerald-400 font-bold' : ''}
              ${line.type === 'info' ? 'text-blue-400 font-semibold' : ''}
              ${line.type === 'accent' ? 'text-emerald-500' : ''}
            `}>
              {renderLineText(line)}
            </span>
          </div>
        ))}
      </div>

      {/* Retro Mini Snake Game Panel */}
      {isSnakeActive && runSnakeGame()}

      {/* Input row */}
      {!isSnakeActive && (
        <form onSubmit={handleCommandSubmit} className="flex items-center mt-1 min-h-[18px] relative">
          <span 
            className="mr-2 select-none shrink-0"
            style={{ color: theme.cursor }}
          >
            {getPromptPrefix()}
          </span>

          <div className="flex-1 relative flex items-center">
            {/* Suggestion Overlay underlay */}
            {tab.shell === 'zsh' && suggestion && (
              <span className="absolute left-0 text-zinc-500 opacity-40 select-none pointer-events-none whitespace-pre">
                {suggestion}
              </span>
            )}

            {/* Actual typing input */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-none outline-none p-0 focus:ring-0 m-0 leading-normal"
              style={{
                caretColor: theme.cursor,
                color: theme.foreground,
              }}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>
        </form>
      )}
      
      {/* Mobile helper touch bar */}
      {isMobile && !isSnakeActive && (
        <div className="flex flex-wrap gap-1.5 mt-4 p-2 bg-zinc-900/40 rounded border border-zinc-800/20 select-none">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleVirtualKeyPress('ArrowUp'); }}
            className="px-2 py-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 font-mono text-zinc-300 transition-colors"
          >
            ↑ Prev
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleVirtualKeyPress('ArrowDown'); }}
            className="px-2 py-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 font-mono text-zinc-300 transition-colors"
          >
            ↓ Next
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleVirtualKeyPress('Tab'); }}
            className="px-2 py-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 font-mono text-zinc-300 transition-colors"
          >
            ⇥ Tab
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleVirtualKeyPress('Ctrl+C'); }}
            className="px-2 py-1 text-[10px] rounded bg-red-950/40 border border-red-900/30 hover:bg-red-900/20 active:bg-red-900/40 font-mono text-red-400 transition-colors"
          >
            Ctrl+C
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); executeCommand('ls'); }}
            className="px-2 py-1 text-[10px] rounded bg-zinc-800/70 hover:bg-zinc-700 active:bg-zinc-600 font-mono text-[#38BDF8] transition-colors"
          >
            ls
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); executeCommand('neofetch'); }}
            className="px-2 py-1 text-[10px] rounded bg-zinc-800/70 hover:bg-zinc-700 active:bg-zinc-600 font-mono text-emerald-400 transition-colors"
          >
            sysinfo
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); executeCommand('help'); }}
            className="px-2 py-1 text-[10px] rounded bg-zinc-800/70 hover:bg-zinc-700 active:bg-zinc-600 font-mono text-amber-400 transition-colors"
          >
            help
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); executeCommand('clear'); }}
            className="px-2 py-1 text-[10px] rounded bg-zinc-800/70 hover:bg-zinc-700 active:bg-zinc-600 font-mono text-zinc-400 transition-colors"
          >
            clear
          </button>
        </div>
      )}
      
      {/* Invisible anchor for automatic scrolling */}
      <div ref={linesEndRef} />
    </div>
  );
};

// Retro Snake Game component written specifically for ZenTerm
interface SnakeProps {
  onGameOver: (score: number) => void;
  theme: Theme;
  isMobile?: boolean;
}

const SnakeGameContainer: React.FC<SnakeProps> = ({ onGameOver, theme, isMobile = false }) => {
  const GRID_SIZE = 15;
  const CELL_COUNT = GRID_SIZE * GRID_SIZE;
  const [snake, setSnake] = useState<number[]>([42, 41, 40]);
  const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('RIGHT');
  const [food, setFood] = useState(105);
  const [score, setScore] = useState(0);

  // Speed of the game
  const speed = 130;

  // Key handlers
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && direction !== 'DOWN') setDirection('UP');
      if (e.key === 'ArrowDown' && direction !== 'UP') setDirection('DOWN');
      if (e.key === 'ArrowLeft' && direction !== 'RIGHT') setDirection('LEFT');
      if (e.key === 'ArrowRight' && direction !== 'LEFT') setDirection('RIGHT');
      if (e.key === 'Escape') {
        onGameOver(score);
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [direction, score, onGameOver]);

  // Main loop
  useEffect(() => {
    const interval = setInterval(() => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        let nextHead = head;

        const row = Math.floor(head / GRID_SIZE);
        const col = head % GRID_SIZE;

        if (direction === 'UP') {
          nextHead = row === 0 ? (GRID_SIZE - 1) * GRID_SIZE + col : head - GRID_SIZE;
        } else if (direction === 'DOWN') {
          nextHead = row === GRID_SIZE - 1 ? col : head + GRID_SIZE;
        } else if (direction === 'LEFT') {
          nextHead = col === 0 ? row * GRID_SIZE + (GRID_SIZE - 1) : head - 1;
        } else if (direction === 'RIGHT') {
          nextHead = col === GRID_SIZE - 1 ? row * GRID_SIZE : head + 1;
        }

        // Check crash on body
        if (prevSnake.includes(nextHead)) {
          clearInterval(interval);
          setTimeout(() => onGameOver(score), 500);
          return prevSnake;
        }

        const newSnake = [nextHead, ...prevSnake];

        // Eat food check
        if (nextHead === food) {
          setScore(s => s + 1);
          // Spawn new food
          let newFood = Math.floor(Math.random() * CELL_COUNT);
          while (newSnake.includes(newFood)) {
            newFood = Math.floor(Math.random() * CELL_COUNT);
          }
          setFood(newFood);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [direction, food, score]);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex justify-between w-full text-xs font-mono text-zinc-400 px-2">
        <span>Score: <span className="text-emerald-400 font-bold">{score}</span></span>
        <span>ESC to Exit Game</span>
      </div>

      {/* Snake Grid Board */}
      <div 
        className="grid gap-px bg-zinc-900 border border-zinc-700 rounded overflow-hidden w-60 h-60 select-none"
        style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
      >
        {Array.from({ length: CELL_COUNT }).map((_, index) => {
          const isSnake = snake.includes(index);
          const isHead = snake[0] === index;
          const isFood = food === index;

          return (
            <div
              key={index}
              className="w-4 h-4 rounded-sm transition-all duration-75"
              style={{
                backgroundColor: isHead 
                  ? theme.cursor 
                  : isSnake 
                    ? theme.cursor + '99' 
                    : isFood 
                      ? theme.red 
                      : '#0a0a0c',
              }}
            />
          );
        })}
      </div>

      {isMobile ? (
        <div className="flex flex-col items-center gap-1 mt-1 select-none">
          <button
            type="button"
            onClick={() => direction !== 'DOWN' && setDirection('UP')}
            className="w-10 h-10 rounded-full bg-zinc-800 active:bg-zinc-700 flex items-center justify-center text-zinc-200 border border-zinc-700 font-bold hover:bg-zinc-700"
          >
            ▲
          </button>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => direction !== 'RIGHT' && setDirection('LEFT')}
              className="w-10 h-10 rounded-full bg-zinc-800 active:bg-zinc-700 flex items-center justify-center text-zinc-200 border border-zinc-700 font-bold hover:bg-zinc-700"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => onGameOver(score)}
              className="w-10 h-10 rounded-full bg-red-900/40 active:bg-red-800 flex items-center justify-center text-red-300 border border-red-700 text-[10px] font-bold"
            >
              EXIT
            </button>
            <button
              type="button"
              onClick={() => direction !== 'LEFT' && setDirection('RIGHT')}
              className="w-10 h-10 rounded-full bg-zinc-800 active:bg-zinc-700 flex items-center justify-center text-zinc-200 border border-zinc-700 font-bold hover:bg-zinc-700"
            >
              ▶
            </button>
          </div>
          <button
            type="button"
            onClick={() => direction !== 'UP' && setDirection('DOWN')}
            className="w-10 h-10 rounded-full bg-zinc-800 active:bg-zinc-700 flex items-center justify-center text-zinc-200 border border-zinc-700 font-bold hover:bg-zinc-700"
          >
            ▼
          </button>
        </div>
      ) : (
        <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Control with keyboard Arrow Keys</span>
        </div>
      )}
    </div>
  );
};
