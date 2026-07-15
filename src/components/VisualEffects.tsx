import React, { useEffect, useRef } from 'react';

// CRT Scanline and Flicker Overlay (fully GPU accelerated)
export const CRTOverlay: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden rounded-xl">
      {/* Scanline Grid */}
      <div 
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
          backgroundSize: '100% 4px',
          willChange: 'transform',
        }}
      />
      {/* Subtle screen flicker */}
      <div 
        className="absolute inset-0 animate-[flicker_0.15s_infinite] bg-transparent opacity-[0.015] pointer-events-none"
        style={{
          background: 'rgba(18, 16, 16, 0.1)',
        }}
      />
      {/* Vignette shadow */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-xl"
        style={{
          boxShadow: 'inset 0 0 80px rgba(0, 0, 0, 0.6)',
        }}
      />
    </div>
  );
};

// SVG Glow Filter that uses GPU compositing
export const GlowFilter: React.FC = () => {
  return (
    <svg className="absolute w-0 h-0 invisible">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComponentTransfer in="blur" result="boost">
            <feFuncA type="linear" slope="1.5" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="boost" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
};

interface MatrixRainProps {
  color: string;
  onExit: () => void;
}

// Matrix Falling Code (HTML5 Canvas + ResizeObserver + requestAnimationFrame)
export const MatrixRain: React.FC<MatrixRainProps> = ({ color, onExit }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let columns = 0;
    let drops: number[] = [];
    const fontSize = 14;

    const characters = 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890XYZ$#@%&+';

    // Handle high-performance resize using ResizeObserver
    const resizeCanvas = (width: number, height: number) => {
      // Set high density display backing if needed, otherwise normal
      canvas.width = width;
      canvas.height = height;

      columns = Math.floor(width / fontSize) + 1;
      drops = [];
      for (let i = 0; i < columns; i++) {
        // Stagger spawn times
        drops[i] = Math.random() * -100;
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      resizeCanvas(width, height);
    });

    resizeObserver.observe(container);

    // Initial sizing based on current container size
    const rect = container.getBoundingClientRect();
    resizeCanvas(rect.width, rect.height);

    // Drawing loop
    const draw = () => {
      // Semi-transparent black bg to create trailing effect (GPU accelerated blending)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = color; // Match custom cursor/accent green
      ctx.font = `bold ${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Brightest highlight at the head of the drop
        if (Math.random() > 0.98) {
          ctx.fillStyle = '#FFFFFF';
        } else {
          ctx.fillStyle = color;
        }

        ctx.fillText(text, x, y);

        // Reset drops when they hit the bottom, with random delay
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Move down
        drops[i]++;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    // Keypress handler to exit
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'q' || (e.ctrlKey && e.key === 'c')) {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [color, onExit]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full bg-black z-30 cursor-none select-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute top-4 right-4 z-40 bg-zinc-900/80 border border-zinc-700 text-zinc-400 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur animate-pulse flex items-center gap-2">
        <span>Running matrix.js</span>
        <kbd className="bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded border border-zinc-600 text-[10px]">ESC</kbd>
        <span>to exit</span>
      </div>
    </div>
  );
};
