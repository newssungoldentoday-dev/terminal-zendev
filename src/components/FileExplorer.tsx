import React, { useState } from 'react';
import { VFileSystem, VirtualFile, Theme } from '../types';
import { listDirectory, makeDirectory, writeTextFile, removePath } from '../utils/fileSystem';
import { 
  Folder, FolderOpen, File, FileCode, BookOpen, Plus, Trash2, 
  ChevronRight, ChevronDown, FileText, Upload
} from 'lucide-react';

interface FileExplorerProps {
  fs: VFileSystem;
  theme: Theme;
  currentDir: string;
  onFsChange: (newFs: VFileSystem) => void;
  onOpenFile: (filePath: string) => void;
  onCd: (dirPath: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  fs,
  theme,
  currentDir,
  onFsChange,
  onOpenFile,
  onCd,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ '/': true, '/projects': true, '/notes': true });
  const [newItemInput, setNewItemInput] = useState<{ parent: string; type: 'file' | 'dir' } | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const toggleFolder = (path: string) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCreateItem = (parent: string, type: 'file' | 'dir') => {
    setNewItemInput({ parent, type });
    setNewItemName('');
  };

  const submitCreateItem = () => {
    if (!newItemName.trim() || !newItemInput) return;
    
    const parentPath = newItemInput.parent;
    const finalPath = parentPath === '/' ? `/${newItemName.trim()}` : `${parentPath}/${newItemName.trim()}`;
    
    let success = false;
    if (newItemInput.type === 'dir') {
      const res = makeDirectory(fs, finalPath);
      success = res.success;
    } else {
      const res = writeTextFile(fs, finalPath, `// Created in ZenTerm on ${new Date().toLocaleDateString()}\n`);
      success = res.success;
    }

    if (success) {
      // Reload filesystem
      const reloadedFs = { ...fs };
      onFsChange(reloadedFs);
      // Auto-expand parent
      setExpanded(prev => ({ ...prev, [parentPath]: true }));
    } else {
      alert(`Failed to create item at ${finalPath}`);
    }

    setNewItemInput(null);
  };

  const handleDeleteItem = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${path}?`)) {
      const res = removePath(fs, path);
      if (res.success) {
        onFsChange({ ...fs });
      } else {
        alert(res.error || 'Failed to delete item');
      }
    }
  };

  // Helper to render file icon based on extension
  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
      return <FileCode className="w-4 h-4 text-emerald-400" />;
    }
    if (fileName.endsWith('.md')) {
      return <BookOpen className="w-4 h-4 text-cyan-400" />;
    }
    if (fileName.endsWith('.txt')) {
      return <FileText className="w-4 h-4 text-zinc-400" />;
    }
    return <File className="w-4 h-4 text-zinc-300" />;
  };

  // Drag and drop handler to upload local system files to VFS
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files) as File[];
    
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const uploadPath = currentDir === '/' ? `/${file.name}` : `${currentDir}/${file.name}`;
        writeTextFile(fs, uploadPath, text || '');
        onFsChange({ ...fs });
      };
      reader.readAsText(file);
    }
  };

  // Recursive directory tree renderer
  const renderTree = (dirPath: string, depth: number) => {
    const contents = listDirectory(fs, dirPath);
    const isExpanded = expanded[dirPath];

    return (
      <div key={dirPath} className="flex flex-col">
        {/* Render Directory Row */}
        {dirPath !== '/' && (
          <div 
            onClick={() => {
              toggleFolder(dirPath);
              onCd(dirPath);
            }}
            className={`group flex items-center justify-between py-1 px-2 rounded text-xs font-mono select-none cursor-pointer hover:bg-white/5 transition-colors ${currentDir === dirPath ? 'bg-white/10 font-bold' : ''}`}
            style={{ paddingLeft: `${depth * 12}px` }}
          >
            <div className="flex items-center gap-1.5 truncate">
              {isExpanded ? <ChevronDown className="w-3 h-3 opacity-60" /> : <ChevronRight className="w-3 h-3 opacity-60" />}
              {isExpanded ? <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" /> : <Folder className="w-4 h-4 text-blue-400 shrink-0" />}
              <span className="truncate">{dirPath.split('/').pop()}</span>
            </div>
            
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 shrink-0 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); handleCreateItem(dirPath, 'file'); }}
                title="Create file"
                className="hover:text-emerald-400 p-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={(e) => handleDeleteItem(e, dirPath)}
                title="Delete directory"
                className="hover:text-red-400 p-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Input box for new item under this directory */}
        {newItemInput && newItemInput.parent === dirPath && (
          <div 
            className="flex items-center gap-1.5 py-1 pr-2"
            style={{ paddingLeft: `${(depth + 1) * 12}px` }}
          >
            {newItemInput.type === 'file' ? <File className="w-3.5 h-3.5 text-zinc-400" /> : <Folder className="w-3.5 h-3.5 text-blue-400" />}
            <input
              type="text"
              autoFocus
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCreateItem();
                if (e.key === 'Escape') setNewItemInput(null);
              }}
              onBlur={submitCreateItem}
              placeholder={newItemInput.type === 'file' ? 'new_file.js' : 'new_folder'}
              className="bg-zinc-800 text-white text-xs px-1.5 py-0.5 rounded outline-none border border-zinc-700 w-full font-mono"
            />
          </div>
        )}

        {/* Children (only if directory is expanded or it's root) */}
        {(isExpanded || dirPath === '/') && (
          <div className="flex flex-col">
            {contents.map(item => {
              if (item.type === 'directory') {
                return renderTree(item.path, depth + 1);
              } else {
                return (
                  <div 
                    key={item.path}
                    onClick={() => onOpenFile(item.path)}
                    className="group flex items-center justify-between py-1 px-2 rounded text-xs font-mono select-none cursor-pointer hover:bg-white/5 transition-colors"
                    style={{ paddingLeft: `${(depth + 1) * 12}px` }}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <div className="w-3 h-3 shrink-0" /> {/* Spacer alignment */}
                      {getFileIcon(item.path)}
                      <span className="truncate">{item.path.split('/').pop()}</span>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 shrink-0 transition-opacity">
                      <button 
                        onClick={(e) => handleDeleteItem(e, item.path)}
                        title="Delete file"
                        className="hover:text-red-400 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="w-64 border-r flex flex-col overflow-hidden select-none transition-all duration-300 shrink-0"
      style={{
        backgroundColor: theme.isDark ? '#0E0E10' : '#F4F4F5',
        borderColor: theme.isDark ? '#27272A' : '#D4D4D8',
        color: theme.isDark ? '#D4D4D8' : '#18181B',
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Title Bar */}
      <div 
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: theme.isDark ? '#27272A' : '#D4D4D8' }}
      >
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 opacity-70" />
          <span className="font-bold text-xs uppercase tracking-wider font-sans">Workspace Files</span>
        </div>
        <button 
          onClick={() => handleCreateItem('/', 'file')}
          title="Create item in root"
          className="hover:text-emerald-400 cursor-pointer text-xs flex items-center gap-1 font-mono opacity-60 hover:opacity-100 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Directory Trees List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {renderTree('/', 0)}
      </div>

      {/* Upload Drag zone reminder */}
      <div 
        className="p-3 border-t text-[10px] font-mono text-center flex flex-col items-center gap-1 select-none"
        style={{ 
          borderColor: theme.isDark ? '#27272A' : '#D4D4D8',
          color: theme.isDark ? '#71717A' : '#71717A'
        }}
      >
        <Upload className="w-3.5 h-3.5 opacity-50" />
        <span>Drag & drop local .txt / .js files here to import</span>
      </div>
    </div>
  );
};
