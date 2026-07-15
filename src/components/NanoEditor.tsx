import React, { useState, useEffect, useRef } from 'react';
import { Theme } from '../types';
import { Save, LogOut, FileText, Sparkles } from 'lucide-react';

interface NanoEditorProps {
  filename: string;
  initialContent: string;
  theme: Theme;
  onSave: (content: string) => void;
  onExit: () => void;
}

export const NanoEditor: React.FC<NanoEditorProps> = ({
  filename,
  initialContent,
  theme,
  onSave,
  onExit,
}) => {
  const [content, setContent] = useState(initialContent);
  const [isModified, setIsModified] = useState(false);
  const [showStatusMessage, setShowStatusMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on load
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Sync content modifications
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsModified(e.target.value !== initialContent);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + S or Ctrl + O to Save
      if ((e.ctrlKey && e.key === 's') || (e.ctrlKey && e.key === 'o')) {
        e.preventDefault();
        handleSave();
      }
      // Ctrl + X to Exit
      if (e.ctrlKey && e.key === 'x') {
        e.preventDefault();
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, isModified]);

  const handleSave = () => {
    onSave(content);
    setIsModified(false);
    triggerStatusMessage('Wrote ' + content.split('\n').length + ' lines to ' + filename);
  };

  const handleExit = () => {
    if (isModified) {
      if (confirm('You have unsaved changes. Save them before exiting?')) {
        onSave(content);
      }
    }
    onExit();
  };

  const triggerStatusMessage = (msg: string) => {
    setShowStatusMessage(msg);
    setTimeout(() => setShowStatusMessage(null), 3000);
  };

  // Split lines to render line numbers column
  const lines = content.split('\n');

  return (
    <div 
      className="flex flex-col h-full select-text"
      style={{
        backgroundColor: theme.background,
        color: theme.foreground,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Nano Header Bar */}
      <div 
        className="flex items-center justify-between text-xs px-4 py-1.5 font-bold select-none"
        style={{
          backgroundColor: theme.foreground,
          color: theme.background,
        }}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ZEN-NANO 1.0</span>
        </div>
        <div className="truncate max-w-[50%]">
          File: <span className="underline">{filename}</span>
          {isModified && <span className="ml-1 text-red-500 font-black animate-pulse">*MODIFIED*</span>}
        </div>
        <div className="text-[10px] opacity-75">
          Press Ctrl+S to Save, Ctrl+X to Exit
        </div>
      </div>

      {/* Editor Main Text Area with Line Numbers */}
      <div className="flex-1 flex overflow-hidden py-2 relative">
        {/* Line Numbers column */}
        <div 
          className="w-12 select-none text-right pr-3 font-mono text-xs opacity-35 border-r border-current/10"
          style={{ color: theme.foreground }}
        >
          {lines.map((_, i) => (
            <div key={i} className="leading-5 h-5">{i + 1}</div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          className="flex-1 resize-none bg-transparent outline-none border-none p-0 pl-3 font-mono text-xs leading-5 focus:ring-0 overflow-y-auto"
          style={{
            caretColor: theme.cursor,
            color: theme.foreground,
          }}
          spellCheck="false"
        />
      </div>

      {/* Interactive Command Center / Nano Shortcut Bar */}
      <div className="border-t border-current/10 p-2 select-none flex flex-col gap-2">
        {/* Real-time status notifications */}
        <div className="h-5 text-xs px-2 flex items-center text-emerald-500 font-mono">
          {showStatusMessage && (
            <span className="flex items-center gap-1.5 animate-pulse">
              <FileText className="w-3.5 h-3.5" />
              {showStatusMessage}
            </span>
          )}
        </div>

        {/* Shortcut Commands Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {/* Exit Button */}
          <button
            onClick={handleExit}
            className="flex items-center justify-between p-2 rounded text-xs font-mono border hover:opacity-80 transition cursor-pointer"
            style={{
              borderColor: theme.foreground + '22',
              backgroundColor: theme.foreground + '0B',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-bold opacity-60">^X</span>
              <span>Exit Nano</span>
            </div>
            <LogOut className="w-3.5 h-3.5" />
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="flex items-center justify-between p-2 rounded text-xs font-mono border hover:opacity-80 transition cursor-pointer"
            style={{
              borderColor: theme.foreground + '22',
              backgroundColor: theme.foreground + '0B',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-bold opacity-60">^S</span>
              <span>Save File</span>
            </div>
            <Save className="w-3.5 h-3.5" />
          </button>

          {/* Quick Help placeholder/buttons for immersive simulation */}
          <div 
            className="hidden md:flex items-center gap-2 p-2 rounded text-xs font-mono opacity-50 border"
            style={{ borderColor: theme.foreground + '11' }}
          >
            <span className="font-bold">^G</span>
            <span>Get Help</span>
          </div>

          <div 
            className="hidden md:flex items-center gap-2 p-2 rounded text-xs font-mono opacity-50 border"
            style={{ borderColor: theme.foreground + '11' }}
          >
            <span className="font-bold">^W</span>
            <span>Where Is</span>
          </div>

          <div 
            className="hidden lg:flex items-center gap-2 p-2 rounded text-xs font-mono opacity-50 border"
            style={{ borderColor: theme.foreground + '11' }}
          >
            <span className="font-bold">^K</span>
            <span>Cut Text</span>
          </div>

          <div 
            className="hidden lg:flex items-center gap-2 p-2 rounded text-xs font-mono opacity-50 border"
            style={{ borderColor: theme.foreground + '11' }}
          >
            <span className="font-bold">^U</span>
            <span>Uncut Text</span>
          </div>
        </div>
      </div>
    </div>
  );
};
