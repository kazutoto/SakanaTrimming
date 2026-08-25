import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, X, Image as ImageIcon, CheckCircle } from 'lucide-react';

const COLORS = {
  '白': '#FFFFFF',
  '黒': '#000000',
  '赤': '#FF0000',
  '青': '#0000FF',
  '黄': '#FFFF00',
  '緑': '#008000',
  'グレー': '#808080',
  'ピンク': '#FFC0CB',
  '紫': '#800080'
};

interface ImageState {
  element: HTMLImageElement;
  w: number;
  h: number;
  canvasSize: number;
  imgX: number;
  imgY: number;
}

interface CropBox {
  x: number;
  y: number;
  size: number;
}

export default function App() {
  const [imageState, setImageState] = useState<ImageState | null>(null);
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [canSave, setCanSave] = useState<boolean>(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const dragState = useRef<{
    type: 'move' | 'nw' | 'ne' | 'sw' | 'se';
    startX: number;
    startY: number;
    startCrop: CropBox;
    scale: number;
  } | null>(null);

  const handleFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        const canvasSize = Math.max(w, h);
        const imgX = (canvasSize - w) / 2;
        const imgY = (canvasSize - h) / 2;
        
        setImageState({ element: img, w, h, canvasSize, imgX, imgY });
        setCropBox({ x: 0, y: 0, size: canvasSize });
        setCanSave(true);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const cancel = () => {
    setImageState(null);
    setCropBox(null);
    setCanSave(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const save = () => {
    if (!imageState || !cropBox) return;

    const canvas = document.createElement('canvas');
    canvas.width = cropBox.size;
    canvas.height = cropBox.size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { element, imgX, imgY } = imageState;
    const drawX = imgX - cropBox.x;
    const drawY = imgY - cropBox.y;

    ctx.drawImage(element, drawX, drawY);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `SakanaTrimming_${date}_${time}.jpg`;
    a.download = filename;
    
    a.click();

    setToastMessage(`画像「${filename}」の保存が完了しました`);
    setCanSave(false);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const onPointerDown = (e: React.PointerEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    if (!containerRef.current || !cropBox || !imageState) return;
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = containerRef.current.getBoundingClientRect();
    const scale = imageState.canvasSize / rect.width;

    dragState.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...cropBox },
      scale
    };
  };

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.current || !imageState) return;
    e.preventDefault();

    const { type, startX, startY, startCrop, scale } = dragState.current;
    const { canvasSize, imgX, imgY, w, h } = imageState;

    const dx = (e.clientX - startX) * scale;
    const dy = (e.clientY - startY) * scale;
    const snapThresh = 10 * scale;

    let newX = startCrop.x;
    let newY = startCrop.y;
    let newSize = startCrop.size;

    if (type === 'move') {
      newX = startCrop.x + dx;
      newY = startCrop.y + dy;

      if (Math.abs(newX - imgX) < snapThresh) newX = imgX;
      if (Math.abs(newX + startCrop.size - (imgX + w)) < snapThresh) newX = imgX + w - startCrop.size;
      if (Math.abs(newY - imgY) < snapThresh) newY = imgY;
      if (Math.abs(newY + startCrop.size - (imgY + h)) < snapThresh) newY = imgY + h - startCrop.size;

      newX = Math.max(0, Math.min(newX, canvasSize - startCrop.size));
      newY = Math.max(0, Math.min(newY, canvasSize - startCrop.size));
    } else {
      let proposedSize = startCrop.size;
      
      if (type === 'se') proposedSize += Math.max(dx, dy);
      else if (type === 'nw') proposedSize += Math.max(-dx, -dy);
      else if (type === 'ne') proposedSize += Math.max(dx, -dy);
      else if (type === 'sw') proposedSize += Math.max(-dx, dy);

      const minSize = 20 * scale;
      let maxSize = canvasSize;
      
      if (type === 'se') maxSize = Math.min(canvasSize - startCrop.x, canvasSize - startCrop.y);
      if (type === 'nw') maxSize = Math.min(startCrop.x + startCrop.size, startCrop.y + startCrop.size);
      if (type === 'ne') maxSize = Math.min(canvasSize - startCrop.x, startCrop.y + startCrop.size);
      if (type === 'sw') maxSize = Math.min(startCrop.x + startCrop.size, canvasSize - startCrop.y);

      proposedSize = Math.max(minSize, Math.min(proposedSize, maxSize));

      if (type === 'se') {
        const distX = Math.abs((startCrop.x + proposedSize) - (imgX + w));
        const distY = Math.abs((startCrop.y + proposedSize) - (imgY + h));
        if (distX < snapThresh && distX <= distY) proposedSize = (imgX + w) - startCrop.x;
        else if (distY < snapThresh) proposedSize = (imgY + h) - startCrop.y;
      } else if (type === 'nw') {
        const distX = Math.abs((startCrop.x + startCrop.size - proposedSize) - imgX);
        const distY = Math.abs((startCrop.y + startCrop.size - proposedSize) - imgY);
        if (distX < snapThresh && distX <= distY) proposedSize = startCrop.x + startCrop.size - imgX;
        else if (distY < snapThresh) proposedSize = startCrop.y + startCrop.size - imgY;
      } else if (type === 'ne') {
        const distX = Math.abs((startCrop.x + proposedSize) - (imgX + w));
        const distY = Math.abs((startCrop.y + startCrop.size - proposedSize) - imgY);
        if (distX < snapThresh && distX <= distY) proposedSize = (imgX + w) - startCrop.x;
        else if (distY < snapThresh) proposedSize = startCrop.y + startCrop.size - imgY;
      } else if (type === 'sw') {
        const distX = Math.abs((startCrop.x + startCrop.size - proposedSize) - imgX);
        const distY = Math.abs((startCrop.y + proposedSize) - (imgY + h));
        if (distX < snapThresh && distX <= distY) proposedSize = startCrop.x + startCrop.size - imgX;
        else if (distY < snapThresh) proposedSize = (imgY + h) - startCrop.y;
      }

      proposedSize = Math.max(minSize, Math.min(proposedSize, maxSize));
      newSize = proposedSize;

      if (type === 'se') {
        newX = startCrop.x;
        newY = startCrop.y;
      } else if (type === 'nw') {
        newX = startCrop.x + startCrop.size - proposedSize;
        newY = startCrop.y + startCrop.size - proposedSize;
      } else if (type === 'ne') {
        newX = startCrop.x;
        newY = startCrop.y + startCrop.size - proposedSize;
      } else if (type === 'sw') {
        newX = startCrop.x + startCrop.size - proposedSize;
        newY = startCrop.y;
      }
    }

    setCropBox({ x: newX, y: newY, size: newSize });
    setCanSave(true);
  }, [imageState]);

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (dragState.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignored
      }
      dragState.current = null;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  return (
    <div 
      className="flex flex-col min-h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans relative"
      style={{
        background: 'radial-gradient(circle at top left, #1e293b, #020617), radial-gradient(circle at bottom right, #1e1b4b, #020617)'
      }}
    >
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white/5 backdrop-blur-xl border-b border-white/10 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            SakanaTrimming
          </h1>
        </div>
          
        {imageState && (
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-black/30 rounded-full border border-white/10">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:block">背景色</label>
            <select
              value={bgColor}
              onChange={(e) => {
                setBgColor(e.target.value);
                setCanSave(true);
              }}
              className="bg-transparent text-sm focus:outline-none cursor-pointer text-slate-100"
            >
              {Object.entries(COLORS).map(([name, hex]) => (
                <option key={name} value={hex} className="bg-slate-800 text-white">{name}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      <main className="flex-grow relative flex flex-col items-center justify-center p-4 sm:p-12 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        {!imageState ? (
          <div 
            className="relative z-10 w-full max-w-2xl bg-white/5 border-2 border-dashed border-white/20 p-8 md:p-16 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/10 transition-all duration-200"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-slate-100">画像を選択またはドロップ</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-sm">
              タップしてスマホの写真を選ぶか、PCからドラッグ＆ドロップしてください。
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <span className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-600/20 transition-all border border-blue-400/20">
              ファイルを選択
            </span>
          </div>
        ) : (
          <div className="relative z-10 w-full max-w-[80vh] sm:max-w-[560px] mx-auto flex flex-col items-center select-none">
            <div 
              ref={containerRef}
              className="relative w-full aspect-square shadow-2xl rounded-sm overflow-hidden flex items-center justify-center bg-white"
              style={{ backgroundColor: bgColor }}
            >
              <img
                src={imageState.element.src}
                alt="Source"
                className="absolute pointer-events-none"
                style={{
                  width: `${(imageState.w / imageState.canvasSize) * 100}%`,
                  height: `${(imageState.h / imageState.canvasSize) * 100}%`,
                  left: `${(imageState.imgX / imageState.canvasSize) * 100}%`,
                  top: `${(imageState.imgY / imageState.canvasSize) * 100}%`
                }}
              />

              {cropBox && (
                <div
                  className="absolute cursor-move touch-none box-border"
                  style={{
                    width: `${(cropBox.size / imageState.canvasSize) * 100}%`,
                    height: `${(cropBox.size / imageState.canvasSize) * 100}%`,
                    left: `${(cropBox.x / imageState.canvasSize) * 100}%`,
                    top: `${(cropBox.y / imageState.canvasSize) * 100}%`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                    border: '2px solid #3b82f6'
                  }}
                  onPointerDown={(e) => onPointerDown(e, 'move')}
                >
                  <div className="absolute inset-0 pointer-events-none border border-blue-500/40 m-auto w-1/3 h-full" />
                  <div className="absolute inset-0 pointer-events-none border border-blue-500/40 m-auto w-full h-1/3" />

                  {(['nw', 'ne', 'sw', 'se'] as const).map((type) => (
                    <div
                      key={type}
                      className="absolute w-12 h-12 flex items-center justify-center -ml-6 -mt-6 touch-none"
                      style={{
                        top: type.includes('n') ? '0%' : '100%',
                        left: type.includes('w') ? '0%' : '100%',
                        cursor: `${type}-resize`
                      }}
                      onPointerDown={(e) => onPointerDown(e, type)}
                    >
                      <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg pointer-events-none" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-3 sm:gap-4 w-full mt-6 sm:mt-8">
              <button
                onClick={cancel}
                className="px-4 py-2.5 text-sm font-medium hover:bg-white/5 rounded-lg transition-colors border border-transparent flex items-center gap-1.5 text-slate-300"
              >
                <X className="w-4 h-4" />
                <span>キャンセル</span>
              </button>
              
              <button
                onClick={save}
                disabled={!canSave}
                className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all border flex items-center gap-2 ${
                  canSave 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 border-blue-400/20'
                    : 'bg-white/10 text-slate-400 cursor-not-allowed border-transparent shadow-none'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>トリミングして保存</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {imageState && (
        <footer className="h-12 px-4 sm:px-6 hidden sm:flex items-center justify-center sm:justify-start bg-white/5 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500 uppercase tracking-widest">
            <span>Canvas: {cropBox?.size ? Math.round(cropBox.size) : '-'} x {cropBox?.size ? Math.round(cropBox.size) : '-'}px</span>
            <span className="h-3 w-px bg-white/10"></span>
            <span>Format: JPEG</span>
          </div>
        </footer>
      )}

      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full shadow-2xl transition-all duration-300">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
