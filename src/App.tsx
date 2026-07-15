import React, { useState, useEffect } from 'react';
import { TerminalTab, Theme, VFileSystem } from './types';
import { loadFileSystem, saveFileSystem } from './utils/fileSystem';
import { loadActiveTheme, saveActiveTheme, loadAllThemes, saveCustomTheme } from './utils/themes';
import { FileExplorer } from './components/FileExplorer';
import { Terminal } from './components/Terminal';
import { NanoEditor } from './components/NanoEditor';
import { CRTOverlay, MatrixRain, GlowFilter } from './components/VisualEffects';
import { 
  Plus, X, Settings, Layout, Monitor, Smartphone, Sparkles, 
  Terminal as TerminalIcon, ShieldCheck, Heart, Trash2, Sliders, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // 1. Core State
  const [fs, setFs] = useState<VFileSystem>(() => loadFileSystem());
  const [theme, setTheme] = useState<Theme>(() => loadActiveTheme());
  const [themesList, setThemesList] = useState<Theme[]>(() => loadAllThemes());
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('zenterm_username') || 'zen_dev';
  });

  const [tabs, setTabs] = useState<TerminalTab[]>(() => {
    // Check if tabs exist in localstorage, otherwise seed default tabs
    try {
      const saved = localStorage.getItem('zenterm_tabs_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load tabs from localstorage', e);
    }

    const defaultWelcomeLines = [
      { id: '1', type: 'accent' as const, text: '==================================================' },
      { id: '2', type: 'accent' as const, text: '   _____            _______                     ' },
      { id: '3', type: 'accent' as const, text: '  / ___/___  ___   /_  __/__ ______ _           ' },
      { id: '4', type: 'accent' as const, text: '  \\__ \\/ _ \\/ _ \\   / / / -_) __/  \' \\          ' },
      { id: '5', type: 'accent' as const, text: ' /___/\\___/_//_/  /_/  \\__/_/ /_/_/_/_/          ' },
      { id: '6', type: 'accent' as const, text: '==================================================' },
      { id: '7', type: 'success' as const, text: '🌸 ZenTerm OS Simulated Environment initialized successfully.' },
      { id: '8', type: 'info' as const, text: '✨ Multi-tab Bash/Zsh architecture loaded with persistent VFS.' },
      { id: '9', type: 'info' as const, text: '💡 Quick Tip: Type `cat welcome.md` to view features or `help` for command manuals.' },
      { id: '10', type: 'output' as const, text: '' }
    ];

    return [
      {
        id: 'default-tab-1',
        title: 'bash::workspace',
        shell: 'bash',
        currentDir: '/',
        history: [],
        historyIndex: 0,
        lines: defaultWelcomeLines,
        isNanoActive: false,
        nanoFilename: '',
        nanoContent: '',
      }
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return tabs[0]?.id || 'default-tab-1';
  });

  // 2. View/UX States
  const [viewportMode, setViewportMode] = useState<'desktop' | 'cellphone'>('desktop');
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isCrtActive, setIsCrtActive] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMatrixActive, setIsMatrixActive] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabTitle, setEditingTabTitle] = useState('');

  // Auto detect mobile screen sizes
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileScreen(mobile);
      if (mobile) {
        setIsSidebarVisible(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 3. Custom Theme State Creator
  const [customBg, setCustomBg] = useState('#121214');
  const [customFg, setCustomFg] = useState('#E4E4E7');
  const [customCursor, setCustomCursor] = useState('#10B981');
  const [customAccent, setCustomAccent] = useState('#3B82F6');
  const [customGlow, setCustomGlow] = useState(false);

  // Sync state changes to storage
  useEffect(() => {
    try {
      localStorage.setItem('zenterm_tabs_v2', JSON.stringify(tabs));
    } catch (e) {
      console.error('Failed to save tabs state', e);
    }
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem('zenterm_username', username);
  }, [username]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // 4. Tab Actions
  const handleCreateTab = (shellType: 'bash' | 'zsh' = 'zsh') => {
    const newId = 'tab-' + Date.now();
    const newTab: TerminalTab = {
      id: newId,
      title: `${shellType}::session-${tabs.length + 1}`,
      shell: shellType,
      currentDir: activeTab?.currentDir || '/',
      history: [],
      historyIndex: 0,
      lines: [
        { id: Math.random().toString(), type: 'success', text: `Spawned brand-new ${shellType} shell session...` },
        { id: Math.random().toString(), type: 'info', text: 'Environment clean. Startup delay: < 0.2ms.' }
      ],
      isNanoActive: false,
      nanoFilename: '',
      nanoContent: '',
    };

    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (tabs.length === 1) return; // Keep at least 1 tab

    const index = tabs.findIndex(t => t.id === tabId);
    const updatedTabs = tabs.filter(t => t.id !== tabId);
    setTabs(updatedTabs);

    if (activeTabId === tabId) {
      // Fallback to closest tab
      const fallbackIndex = index === 0 ? 0 : index - 1;
      setActiveTabId(updatedTabs[fallbackIndex].id);
    }
  };

  const handleUpdateTab = (updatedTab: TerminalTab) => {
    setTabs(tabs.map(t => t.id === updatedTab.id ? updatedTab : t));
  };

  const handleRenameTab = (tabId: string) => {
    if (!editingTabTitle.trim()) return;
    setTabs(tabs.map(t => t.id === tabId ? { ...t, title: editingTabTitle.trim() } : t));
    setEditingTabId(null);
  };

  // 5. File System & Theme Synchronization Actions
  const handleFsChange = (newFs: VFileSystem) => {
    setFs(newFs);
    saveFileSystem(newFs);
  };

  const handleThemeChange = (themeId: string) => {
    saveActiveTheme(themeId);
    const selected = themesList.find(t => t.id === themeId);
    if (selected) {
      setTheme(selected);
      // Prefill Custom Customizer with loaded theme
      setCustomBg(selected.background);
      setCustomFg(selected.foreground);
      setCustomCursor(selected.cursor);
      setCustomAccent(selected.accent);
      setCustomGlow(selected.glow);
    }
  };

  // Create & Apply custom theme
  const handleSaveCustomTheme = () => {
    const newTheme: Theme = {
      id: 'custom-' + Date.now(),
      name: 'Custom User Theme ✨',
      background: customBg,
      foreground: customFg,
      cursor: customCursor,
      accent: customAccent,
      red: '#EF4444',
      green: '#10B981',
      yellow: '#F59E0B',
      blue: '#3B82F6',
      magenta: '#EC4899',
      cyan: '#06B6D4',
      white: '#FAFAFA',
      glow: customGlow,
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
      isDark: true,
    };

    saveCustomTheme(newTheme);
    const updatedAll = loadAllThemes();
    setThemesList(updatedAll);
    setTheme(newTheme);
    saveActiveTheme(newTheme.id);
  };

  // File explorer interactions
  const handleOpenFile = (filePath: string) => {
    const file = fs[filePath];
    if (file && file.type === 'file') {
      const updatedTab = {
        ...activeTab,
        isNanoActive: true,
        nanoFilename: filePath,
        nanoContent: file.content || '',
      };
      handleUpdateTab(updatedTab);
    }
  };

  const handleCdFromSidebar = (dirPath: string) => {
    const updatedTab = {
      ...activeTab,
      currentDir: dirPath,
    };
    handleUpdateTab(updatedTab);
  };

  // 6. Nano Callback saves
  const handleSaveNanoContent = (content: string) => {
    const path = activeTab.nanoFilename;
    const fileNode = fs[path];
    if (fileNode) {
      fileNode.content = content;
      fileNode.updatedAt = new Date().toISOString();
      handleFsChange({ ...fs });
    }
  };

  const handleExitNano = () => {
    const updatedTab = {
      ...activeTab,
      isNanoActive: false,
    };
    handleUpdateTab(updatedTab);
  };

  // Style property bindings
  const themeVariables = {
    '--bg': theme.background,
    '--fg': theme.foreground,
    '--cursor': theme.cursor,
    '--accent': theme.accent,
  } as React.CSSProperties;

  const renderMainAppContent = (isMobileView: boolean) => {
    return (
      <div 
        className="flex flex-col h-full overflow-hidden text-sm relative"
        style={{
          ...themeVariables,
          backgroundColor: theme.background,
          color: theme.foreground,
        }}
      >
      <GlowFilter />
      <CRTOverlay active={isCrtActive} />

      {/* MATRIX SCI-FI SCREENSAVER OVERLAY */}
      {isMatrixActive && (
        <MatrixRain 
          color={theme.cursor} 
          onExit={() => setIsMatrixActive(false)} 
        />
      )}

      {/* HEADER / NAVIGATION BAR */}
      <header 
        className="flex items-center justify-between px-4 h-12 border-b select-none shrink-0"
        style={{
          borderColor: theme.isDark ? '#27272A' : '#D4D4D8',
          backgroundColor: theme.isDark ? '#18181B' : '#E4E4E7',
        }}
      >
        <div className="flex items-center gap-4 h-full">
          {/* Mac-style Window Controls */}
          <div className="flex gap-1.5 mr-1 shrink-0">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] opacity-90 hover:opacity-100 transition-opacity"></div>
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] opacity-90 hover:opacity-100 transition-opacity"></div>
            <div className="w-3 h-3 rounded-full bg-[#27C93F] opacity-90 hover:opacity-100 transition-opacity"></div>
          </div>

          {/* LOGO */}
          <div className="hidden sm:flex items-center gap-1.5 font-bold tracking-tight text-sm text-emerald-400 shrink-0">
            <TerminalIcon className="w-4 h-4 text-[var(--cursor)] shrink-0" style={{ color: theme.cursor }} />
            <span style={{ color: theme.foreground }} className="font-sans">ZenTerm</span>
            <span className="text-[10px] opacity-40 font-mono font-bold">v1.2.0</span>
          </div>

          {/* DYNAMIC TAB MANAGER */}
          <div className="flex items-end h-full gap-1 overflow-x-auto scrollbar-none max-w-md md:max-w-xl">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group relative flex items-center gap-1.5 px-4 h-9 rounded-t-lg text-xs font-mono select-none cursor-pointer border-t border-x transition-all duration-150 ${
                    isActive 
                      ? 'font-semibold' 
                      : 'opacity-50 hover:opacity-90 hover:bg-zinc-800/10'
                  }`}
                  style={{
                    backgroundColor: isActive ? theme.background : 'transparent',
                    borderColor: isActive ? (theme.isDark ? '#27272A' : '#D4D4D8') : 'transparent',
                    color: isActive ? theme.foreground : (theme.isDark ? '#A1A1AA' : '#52525B'),
                  }}
                >
                  {/* Active dot */}
                  {isActive && (
                    <span className="text-[10px] mr-0.5 animate-pulse" style={{ color: theme.cursor }}>●</span>
                  )}

                  {/* Tab Title Renamer */}
                  {editingTabId === tab.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingTabTitle}
                      onChange={(e) => setEditingTabTitle(e.target.value)}
                      onBlur={() => handleRenameTab(tab.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameTab(tab.id);
                        if (e.key === 'Escape') setEditingTabId(null);
                      }}
                      className="bg-zinc-800 text-white text-[10px] px-1 py-0.5 rounded outline-none border border-zinc-600 font-mono w-24"
                    />
                  ) : (
                    <span 
                      onDoubleClick={() => {
                        setEditingTabId(tab.id);
                        setEditingTabTitle(tab.title);
                      }}
                      className="truncate max-w-[120px]"
                      title="Double click to rename tab"
                    >
                      {tab.title}
                    </span>
                  )}

                  {/* Close Tab Button */}
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      className="p-0.5 rounded-full opacity-40 hover:opacity-100 hover:bg-zinc-700/50 hover:text-white transition cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Quick Create Shell button */}
            <div className="flex items-center h-9 pb-1 ml-1">
              <button
                onClick={() => handleCreateTab('zsh')}
                title="Create Zsh tab"
                className="p-1 rounded opacity-50 hover:opacity-100 hover:bg-zinc-800/30 transition cursor-pointer"
                style={{ color: theme.foreground }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CONTROLLER TOOLBAR */}
        <div className="flex items-center gap-1">
          {/* View Mode Toggle Segmented Control (Only on screens >= 640px) */}
          <div className="hidden md:flex items-center bg-zinc-950/40 p-0.5 rounded-lg border border-zinc-800/60 mr-2 text-xs">
            <button
              onClick={() => {
                setViewportMode('desktop');
                setIsSidebarVisible(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewportMode === 'desktop'
                  ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              style={{
                color: viewportMode === 'desktop' ? theme.cursor : (theme.isDark ? '#A1A1AA' : '#52525B')
              }}
              title="Show standard desktop layout site"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop Site</span>
            </button>
            <button
              onClick={() => {
                setViewportMode('cellphone');
                setIsSidebarVisible(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewportMode === 'cellphone'
                  ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              style={{
                color: viewportMode === 'cellphone' ? theme.cursor : (theme.isDark ? '#A1A1AA' : '#52525B')
              }}
              title="Preview Cellphone/Mobile layout site simulator"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Cellphone Site</span>
            </button>
          </div>

          {/* Workspace Toggle */}
          <button
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            title="Toggle File Explorer (Ctrl+B)"
            className={`p-2 rounded hover:bg-zinc-800/50 transition cursor-pointer ${isSidebarVisible ? 'text-emerald-400' : 'text-zinc-400'}`}
          >
            <Layout className="w-4 h-4" />
          </button>

          {/* CRT Overlay Toggle */}
          <button
            onClick={() => setIsCrtActive(!isCrtActive)}
            title="Toggle GPU CRT Screen scanlines"
            className={`p-2 rounded hover:bg-zinc-800/50 transition cursor-pointer ${isCrtActive ? 'text-emerald-400' : 'text-zinc-400'}`}
          >
            <Monitor className="w-4 h-4" />
          </button>

          {/* Glowing Text Filter */}
          <button
            onClick={() => setTheme({ ...theme, glow: !theme.glow })}
            title="Toggle Text Neon Glow"
            className={`p-2 rounded hover:bg-zinc-800/50 transition cursor-pointer ${theme.glow ? 'text-emerald-400' : 'text-zinc-400'}`}
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Custom Matrix Mode */}
          <button
            onClick={() => setIsMatrixActive(true)}
            title="Run matrix.js Screensaver"
            className="p-2 rounded hover:bg-zinc-800/50 text-zinc-400 hover:text-emerald-400 transition cursor-pointer"
          >
            <TerminalIcon className="w-4 h-4 text-emerald-500 animate-pulse" />
          </button>

          {/* Settings Toggle */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Customize themes & profile settings"
            className={`p-2 rounded hover:bg-zinc-800/50 transition cursor-pointer ${isSettingsOpen ? 'text-emerald-400' : 'text-zinc-400'}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER PANELS */}
      <div className="flex-1 flex overflow-hidden relative">
        <AnimatePresence mode="popLayout">
          {isSidebarVisible && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-hidden shrink-0"
            >
              <FileExplorer
                fs={fs}
                theme={theme}
                currentDir={activeTab?.currentDir || '/'}
                onFsChange={handleFsChange}
                onOpenFile={handleOpenFile}
                onCd={handleCdFromSidebar}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN TERMINAL SCREEN */}
        <div 
          className="flex-1 h-full overflow-hidden flex flex-col relative"
          style={{ backgroundColor: theme.background }}
        >
          {activeTab?.isNanoActive ? (
            <NanoEditor
              filename={activeTab.nanoFilename}
              initialContent={activeTab.nanoContent}
              theme={theme}
              onSave={handleSaveNanoContent}
              onExit={handleExitNano}
            />
          ) : (
            <div className={`flex-1 flex flex-col h-full overflow-hidden ${theme.glow ? 'neon-glow-text' : ''}`}>
              <Terminal
                tab={activeTab}
                theme={theme}
                fs={fs}
                username={username}
                onUpdateTab={handleUpdateTab}
                onFsChange={handleFsChange}
                onThemeChange={handleThemeChange}
                onTriggerMatrix={() => setIsMatrixActive(true)}
                isMobile={viewportMode === 'cellphone' || isMobileScreen}
              />
            </div>
          )}
        </div>

        {/* SLIDE-OUT PANEL FOR THEMES & CONFIG */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ x: 350 }}
              animate={{ x: 0 }}
              exit={{ x: 350 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-900 border-l border-zinc-800 text-zinc-300 p-5 z-40 overflow-y-auto font-sans flex flex-col gap-6"
              style={{
                backgroundColor: theme.isDark ? '#0F0F11' : '#F5F5F7',
                borderColor: theme.isDark ? '#232329' : '#D1CAD6',
                color: theme.isDark ? '#E4E4E7' : '#1A1A1A'
              }}
            >
              {/* Settings Header */}
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.isDark ? '#232329' : '#D1CAD6' }}>
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm tracking-wider uppercase">ZenTerm Studio</h3>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Developer Profile Config */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Developer Persona</span>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-zinc-400">Global Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-black/40 border border-zinc-700/50 rounded px-2.5 py-1.5 text-xs font-mono text-emerald-400 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Preset Theme Selection */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Select Preset Theme</span>
                <div className="relative">
                  <select
                    value={theme.id}
                    onChange={(e) => handleThemeChange(e.target.value)}
                    className="w-full bg-black/40 border border-zinc-700/50 rounded px-3 py-2 text-xs font-sans outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                  >
                    {themesList.map((t) => (
                      <option key={t.id} value={t.id} className="bg-zinc-950 text-white">
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-2.5 pointer-events-none opacity-50" />
                </div>
              </div>

              {/* Custom Theme Designer Panel */}
              <div className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: theme.isDark ? '#232329' : '#D1CAD6' }}>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Custom Theme Creator</span>
                
                <div className="flex flex-col gap-2.5">
                  {/* Colors Customization */}
                  <div className="flex items-center justify-between text-xs">
                    <span>Background</span>
                    <input 
                      type="color" 
                      value={customBg} 
                      onChange={(e) => setCustomBg(e.target.value)}
                      className="w-8 h-6 bg-transparent cursor-pointer rounded border border-zinc-700"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span>Foreground Text</span>
                    <input 
                      type="color" 
                      value={customFg} 
                      onChange={(e) => setCustomFg(e.target.value)}
                      className="w-8 h-6 bg-transparent cursor-pointer rounded border border-zinc-700"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span>Shell Cursor</span>
                    <input 
                      type="color" 
                      value={customCursor} 
                      onChange={(e) => setCustomCursor(e.target.value)}
                      className="w-8 h-6 bg-transparent cursor-pointer rounded border border-zinc-700"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span>Accent Highlight</span>
                    <input 
                      type="color" 
                      value={customAccent} 
                      onChange={(e) => setCustomAccent(e.target.value)}
                      className="w-8 h-6 bg-transparent cursor-pointer rounded border border-zinc-700"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span>Default Text Glow</span>
                    <input 
                      type="checkbox"
                      checked={customGlow}
                      onChange={(e) => setCustomGlow(e.target.checked)}
                      className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveCustomTheme}
                  className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 px-3 rounded text-xs tracking-wider transition-colors uppercase cursor-pointer"
                >
                  Apply & Save Theme
                </button>
              </div>

              {/* GPU Performance diagnostic */}
              <div className="mt-auto border-t pt-4" style={{ borderColor: theme.isDark ? '#232329' : '#D1CAD6' }}>
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest block mb-2">Performance Monitor</span>
                <div className="bg-black/30 rounded p-2.5 font-mono text-[10px] flex flex-col gap-1 border border-zinc-800/40">
                  <div className="flex justify-between">
                    <span className="opacity-60">Tab Startup:</span>
                    <span className="text-emerald-400 font-bold">0.18 ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Render Pipeline:</span>
                    <span className="text-emerald-400 font-bold">60 FPS (GPU)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Virtual Memory:</span>
                    <span className="text-zinc-400">100% Client-Side</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM STATUS BAR */}
      <footer 
        className="flex items-center justify-between h-7 px-4 border-t text-[11px] font-sans select-none shrink-0"
        style={{
          borderColor: theme.isDark ? '#27272A' : '#D4D4D8',
          backgroundColor: theme.isDark ? '#18181B' : '#F4F4F5',
          color: theme.isDark ? '#A1A1AA' : '#52525B',
        }}
      >
        <div className="flex gap-4 md:gap-6 items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4ADE80]"></span>
            <span className="opacity-70 font-mono text-[10px] uppercase">{activeTab?.shell || 'zsh'} 5.2.15</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="opacity-40">THEME</span>
            <span className="opacity-70 font-mono text-[10px]">{theme.name}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="opacity-40">PATH</span>
            <span className="opacity-70 font-mono text-[10px] truncate max-w-[150px]">{activeTab?.currentDir}</span>
          </div>
        </div>
        
        <div className="flex gap-4 md:gap-6 items-center">
          <div className="flex items-center gap-1.5">
            <span className="opacity-40">GPU</span>
            <span className="opacity-70 text-[#38BDF8] font-bold text-[10px] font-mono">ENABLED</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="opacity-40">UTF-8</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="opacity-70 font-bold font-mono text-[10px]">Line {activeTab?.history?.length || 1}, Col 1</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

if (viewportMode === 'cellphone' && !isMobileScreen) {
  return (
    <div className="w-screen h-screen bg-[#09090B] flex flex-col justify-center items-center overflow-hidden font-sans relative select-none">
      <div className="absolute inset-0 bg-radial-at-t from-zinc-900 via-zinc-950 to-black pointer-events-none opacity-80" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Device Lab Sticky Top Bar Control */}
      <div className="absolute top-4 left-4 right-4 h-12 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl px-4 flex items-center justify-between z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
          <div className="text-left">
            <h1 className="text-xs md:text-sm font-bold text-zinc-100 flex items-center gap-1.5 leading-none">
              ZenTerm Device Lab <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-mono border border-emerald-800/50 uppercase tracking-wide">Cellphone site mode</span>
            </h1>
            <p className="text-[10px] text-zinc-500 mt-0.5 hidden sm:block">Previewing mobile layout, touch helpers & virtual keyboard keys</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setViewportMode('desktop');
              setIsSidebarVisible(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-100 transition shadow cursor-pointer font-medium"
          >
            <Monitor className="w-3.5 h-3.5 text-zinc-400" />
            <span>Switch to Desktop Site</span>
          </button>
        </div>
      </div>

      {/* Elegant Smartphone Chassis Frame Mockup */}
      <div className="relative w-[340px] h-[680px] sm:w-[360px] sm:h-[720px] bg-zinc-950 rounded-[48px] border-[12px] border-zinc-800 shadow-[0_0_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden select-none z-10 transition-transform mt-8">
        {/* Hardware ear speaker + camera island notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-2xl z-50 flex items-center justify-center gap-1.5 pointer-events-none">
          <div className="w-8 h-1 bg-zinc-900 rounded-full" />
          <div className="w-2 h-2 bg-zinc-900 rounded-full" />
        </div>

        {/* Smartphone Status Bar Overlay (Mock Carrier, Time, Wifi, Battery) */}
        <div className="h-10 bg-zinc-950 px-6 pt-1 flex items-center justify-between text-zinc-400 font-sans text-[11px] select-none z-40 shrink-0">
          <span className="font-semibold text-zinc-200">09:41</span>
          <div className="flex items-center gap-1.5 text-[9px] font-medium text-zinc-400">
            <span>ZenCell</span>
            <span>5G</span>
            <span>📶</span>
            <span className="text-emerald-400">⚡ 98%</span>
          </div>
        </div>

        {/* The Inner App Container bounded strictly inside the smartphone */}
        <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col">
          {renderMainAppContent(true)}
        </div>

        {/* Home swipe gesture bar at bottom */}
        <div className="h-4 bg-zinc-950 flex justify-center items-center select-none z-40 shrink-0">
          <div className="w-24 h-1 bg-zinc-700 rounded-full" />
        </div>
      </div>

      <div className="absolute bottom-4 text-[10px] text-zinc-500 font-mono text-center">
        Interactive Cellphone Live Simulation. Tap inside the terminal screen to type or play games.
      </div>
    </div>
  );
}

return (
  <div className="w-screen h-screen overflow-hidden">
    {renderMainAppContent(isMobileScreen)}
  </div>
);
}
