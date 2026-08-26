/// <reference types="vite/client" />
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, X, Image as ImageIcon, CheckCircle, Pipette, RefreshCw } from 'lucide-react';

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
  w: number;
  h: number;
}

interface StampState {
  text: string;
  x: number;
  y: number;
  scale: number;
  angle: number;
  color: string;
}

export default function App() {
  const [imageState, setImageState] = useState<ImageState | null>(null);
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
  const [isSquareCrop, setIsSquareCrop] = useState<boolean>(true);
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [canSave, setCanSave] = useState<boolean>(true);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);
  const [stamp, setStamp] = useState<StampState | null>(null);
  const [stampInput, setStampInput] = useState<string>('🐟');
  const [stampColor, setStampColor] = useState<string>('#000000');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const dragState = useRef<{
    type: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
    startX: number;
    startY: number;
    startCrop: CropBox;
    scale: number;
    initialSnap: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  } | null>(null);

  const stampDragState = useRef<{
    type: 'move' | 'scaleRotate';
    startX: number;
    startY: number;
    startStamp: StampState;
    startAngle: number;
    startDist: number;
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
        setCropBox({ x: 0, y: 0, w: canvasSize, h: canvasSize });
        setCanSave(true);
        setStamp(null);
        setStampInput('🐟');
        setStampColor('#000000');
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
    setPreviewDataUrl(null);
    setStamp(null);
    setStampInput('🐟');
    setStampColor('#000000');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeCrop = () => {
    if (!imageState || !cropBox) return;

    const { element, imgX, imgY, w: imgW, h: imgH } = imageState;
    const { x: cx, y: cy, w: cw, h: ch } = cropBox;

    const ix = Math.max(cx, imgX);
    const iy = Math.max(cy, imgY);
    const iRight = Math.min(cx + cw, imgX + imgW);
    const iBottom = Math.min(cy + ch, imgY + imgH);

    const iw = Math.max(0, iRight - ix);
    const ih = Math.max(0, iBottom - iy);

    let outSize = Math.max(iw, ih);
    if (outSize === 0) {
      outSize = Math.max(cw, ch);
    }

    const canvas = document.createElement('canvas');
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imgW;
    tempCanvas.height = imgH;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(element, 0, 0);

      if (stamp) {
        tCtx.save();
        tCtx.translate(stamp.x - imgX, stamp.y - imgY);
        tCtx.rotate((stamp.angle * Math.PI) / 180);
        const baseSize = imageState.canvasSize * 0.15;
        const fontSize = baseSize * stamp.scale * 0.8;
        tCtx.font = `bold ${fontSize}px sans-serif`;
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.fillStyle = stamp.color;
        tCtx.fillText(stamp.text, 0, 0);
        tCtx.restore();
      }
    }

    if (iw > 0 && ih > 0) {
      const sx = ix - imgX;
      const sy = iy - imgY;
      const dx = (outSize - iw) / 2;
      const dy = (outSize - ih) / 2;
      ctx.drawImage(tempCanvas, sx, sy, iw, ih, dx, dy, iw, ih);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setPreviewDataUrl(dataUrl);
  };

  const downloadPreview = async () => {
    if (!previewDataUrl) return;
    
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `SakanaTrimming_${date}_${time}.jpg`;

    const finishSave = () => {
      setToastMessage(`画像「${filename}」の保存が完了しました`);
      setPreviewDataUrl(null);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    };

    const fallbackDownload = () => {
      const a = document.createElement('a');
      a.href = previewDataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      finishSave();
    };

    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      try {
        const byteString = atob(previewDataUrl.split(',')[1]);
        const mimeString = previewDataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const file = new File([blob], filename, { type: mimeString });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: filename,
            });
            finishSave();
          } catch (error: any) {
            if (error.name !== 'AbortError') {
              console.error('Share failed:', error);
              fallbackDownload();
            }
          }
          return;
        }
      } catch (e) {
        console.error('Error preparing file for share:', e);
      }
    }

    fallbackDownload();
  };

  const extractColorFromPointer = (e: React.PointerEvent) => {
    if (!containerRef.current || !imageState) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scale = imageState.canvasSize / rect.width;
    const actualX = (e.clientX - rect.left) * scale;
    const actualY = (e.clientY - rect.top) * scale;

    const { imgX, imgY, w, h, element } = imageState;

    if (actualX >= imgX && actualX <= imgX + w && actualY >= imgY && actualY <= imgY + h) {
      const scaleX = element.naturalWidth / w;
      const scaleY = element.naturalHeight / h;

      const sx = (actualX - imgX) * scaleX;
      const sy = (actualY - imgY) * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(element, Math.floor(sx), Math.floor(sy), 1, 1, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
        setBgColor(hex);
        setCanSave(true);
      }
    }
  };

  const handleEyedropperPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    extractColorFromPointer(e);
  };

  const handleEyedropperPointerMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      extractColorFromPointer(e);
    }
  };

  const handleEyedropperPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      extractColorFromPointer(e);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsEyedropperActive(false);
  };

  const addStamp = (text: string, color: string) => {
    if (!imageState) return;
    setStamp((prevStamp) => ({
      text: text,
      color: color,
      x: prevStamp ? prevStamp.x : imageState.canvasSize / 2,
      y: prevStamp ? prevStamp.y : imageState.canvasSize / 2,
      scale: prevStamp ? prevStamp.scale : 1,
      angle: prevStamp ? prevStamp.angle : 0
    }));
    setCanSave(true);
  };

  const handleStampPointerDown = (e: React.PointerEvent, type: 'move' | 'scaleRotate') => {
    e.stopPropagation();
    if (!containerRef.current || !stamp || !imageState) return;
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = containerRef.current.getBoundingClientRect();
    
    const centerX = rect.left + (stamp.x / imageState.canvasSize) * rect.width;
    const centerY = rect.top + (stamp.y / imageState.canvasSize) * rect.width;
    
    stampDragState.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startStamp: { ...stamp },
      startAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX),
      startDist: Math.hypot(e.clientY - centerY, e.clientX - centerX)
    };
  };

  const onPointerDown = (e: React.PointerEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => {
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
      scale,
      initialSnap: {
        top: Math.abs(cropBox.y - imageState.imgY) < 1,
        bottom: Math.abs((cropBox.y + cropBox.h) - (imageState.imgY + imageState.h)) < 1,
        left: Math.abs(cropBox.x - imageState.imgX) < 1,
        right: Math.abs((cropBox.x + cropBox.w) - (imageState.imgX + imageState.w)) < 1,
      }
    };
  };

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (stampDragState.current && imageState) {
      e.preventDefault();
      const { type, startX, startY, startStamp, startAngle, startDist } = stampDragState.current;
      const rect = containerRef.current!.getBoundingClientRect();
      const scaleToCanvas = imageState.canvasSize / rect.width;
      
      if (type === 'move') {
        const dx = (e.clientX - startX) * scaleToCanvas;
        const dy = (e.clientY - startY) * scaleToCanvas;
        setStamp({ ...startStamp, x: startStamp.x + dx, y: startStamp.y + dy });
        setCanSave(true);
      } else if (type === 'scaleRotate') {
        const centerX = rect.left + (startStamp.x / imageState.canvasSize) * rect.width;
        const centerY = rect.top + (startStamp.y / imageState.canvasSize) * rect.width;
        
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const currentDist = Math.hypot(e.clientY - centerY, e.clientX - centerX);
        
        let deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
        const newScale = startStamp.scale * (currentDist / startDist);
        
        setStamp({ 
          ...startStamp, 
          angle: startStamp.angle + deltaAngle,
          scale: Math.max(0.2, newScale)
        });
        setCanSave(true);
      }
      return;
    }

    if (!dragState.current || !imageState) return;
    e.preventDefault();

    const { type, startX, startY, startCrop, scale, initialSnap } = dragState.current;
    const { canvasSize, imgX, imgY, w, h } = imageState;

    const dx = (e.clientX - startX) * scale;
    const dy = (e.clientY - startY) * scale;
    const snapThresh = 15 * scale;

    let newX = startCrop.x;
    let newY = startCrop.y;
    let newW = startCrop.w;
    let newH = startCrop.h;

    if (type === 'move') {
      newX = startCrop.x + dx;
      newY = startCrop.y + dy;

      if (!initialSnap.left && Math.abs(newX - imgX) < snapThresh) newX = imgX;
      if (!initialSnap.right && Math.abs(newX + startCrop.w - (imgX + w)) < snapThresh) newX = imgX + w - startCrop.w;
      if (!initialSnap.top && Math.abs(newY - imgY) < snapThresh) newY = imgY;
      if (!initialSnap.bottom && Math.abs(newY + startCrop.h - (imgY + h)) < snapThresh) newY = imgY + h - startCrop.h;

      newX = Math.max(0, Math.min(newX, canvasSize - startCrop.w));
      newY = Math.max(0, Math.min(newY, canvasSize - startCrop.h));
    } else {
      const minSize = 20 * scale;

      if (isSquareCrop) {
        let propSize = startCrop.w;
        let effType = type;
        if (type === 'e' || type === 's') effType = 'se';
        if (type === 'w' || type === 'n') effType = 'nw';

        if (type === 'se') propSize += Math.max(dx, dy);
        else if (type === 'nw') propSize += Math.max(-dx, -dy);
        else if (type === 'ne') propSize += Math.max(dx, -dy);
        else if (type === 'sw') propSize += Math.max(-dx, dy);
        else if (type === 'e') propSize += dx;
        else if (type === 's') propSize += dy;
        else if (type === 'w') propSize += -dx;
        else if (type === 'n') propSize += -dy;

        let maxSize = canvasSize;
        if (effType === 'se') maxSize = Math.min(canvasSize - startCrop.x, canvasSize - startCrop.y);
        else if (effType === 'nw') maxSize = Math.min(startCrop.x + startCrop.w, startCrop.y + startCrop.h);
        else if (effType === 'ne') maxSize = Math.min(canvasSize - startCrop.x, startCrop.y + startCrop.h);
        else if (effType === 'sw') maxSize = Math.min(startCrop.x + startCrop.w, canvasSize - startCrop.y);

        propSize = Math.max(minSize, Math.min(propSize, maxSize));

        if (effType === 'se') {
          const distX = Math.abs((startCrop.x + propSize) - (imgX + w));
          const distY = Math.abs((startCrop.y + propSize) - (imgY + h));
          const snapRight = !initialSnap.right && distX < snapThresh;
          const snapBottom = !initialSnap.bottom && distY < snapThresh;
          
          if (type === 'e' && snapRight) propSize = (imgX + w) - startCrop.x;
          else if (type === 's' && snapBottom) propSize = (imgY + h) - startCrop.y;
          else if (snapRight && snapBottom) propSize = distX <= distY ? (imgX + w) - startCrop.x : (imgY + h) - startCrop.y;
          else if (snapRight) propSize = (imgX + w) - startCrop.x;
          else if (snapBottom) propSize = (imgY + h) - startCrop.y;
        } else if (effType === 'nw') {
          const distX = Math.abs((startCrop.x + startCrop.w - propSize) - imgX);
          const distY = Math.abs((startCrop.y + startCrop.h - propSize) - imgY);
          const snapLeft = !initialSnap.left && distX < snapThresh;
          const snapTop = !initialSnap.top && distY < snapThresh;

          if (type === 'w' && snapLeft) propSize = startCrop.x + startCrop.w - imgX;
          else if (type === 'n' && snapTop) propSize = startCrop.y + startCrop.h - imgY;
          else if (snapLeft && snapTop) propSize = distX <= distY ? startCrop.x + startCrop.w - imgX : startCrop.y + startCrop.h - imgY;
          else if (snapLeft) propSize = startCrop.x + startCrop.w - imgX;
          else if (snapTop) propSize = startCrop.y + startCrop.h - imgY;
        } else if (effType === 'ne') {
          const distX = Math.abs((startCrop.x + propSize) - (imgX + w));
          const distY = Math.abs((startCrop.y + startCrop.h - propSize) - imgY);
          const snapRight = !initialSnap.right && distX < snapThresh;
          const snapTop = !initialSnap.top && distY < snapThresh;

          if (snapRight && snapTop) propSize = distX <= distY ? (imgX + w) - startCrop.x : startCrop.y + startCrop.h - imgY;
          else if (snapRight) propSize = (imgX + w) - startCrop.x;
          else if (snapTop) propSize = startCrop.y + startCrop.h - imgY;
        } else if (effType === 'sw') {
          const distX = Math.abs((startCrop.x + startCrop.w - propSize) - imgX);
          const distY = Math.abs((startCrop.y + propSize) - (imgY + h));
          const snapLeft = !initialSnap.left && distX < snapThresh;
          const snapBottom = !initialSnap.bottom && distY < snapThresh;

          if (snapLeft && snapBottom) propSize = distX <= distY ? startCrop.x + startCrop.w - imgX : (imgY + h) - startCrop.y;
          else if (snapLeft) propSize = startCrop.x + startCrop.w - imgX;
          else if (snapBottom) propSize = (imgY + h) - startCrop.y;
        }

        propSize = Math.max(minSize, Math.min(propSize, maxSize));
        newW = propSize;
        newH = propSize;

        if (effType === 'se') {
          newX = startCrop.x;
          newY = startCrop.y;
        } else if (effType === 'nw') {
          newX = startCrop.x + startCrop.w - newW;
          newY = startCrop.y + startCrop.h - newH;
        } else if (effType === 'ne') {
          newX = startCrop.x;
          newY = startCrop.y + startCrop.h - newH;
        } else if (effType === 'sw') {
          newX = startCrop.x + startCrop.w - newW;
          newY = startCrop.y;
        }
      } else {
        let propW = startCrop.w;
        let propH = startCrop.h;

        if (type === 'se') { propW += dx; propH += dy; }
        else if (type === 'nw') { propW -= dx; propH -= dy; }
        else if (type === 'ne') { propW += dx; propH -= dy; }
        else if (type === 'sw') { propW -= dx; propH += dy; }
        else if (type === 'e') { propW += dx; }
        else if (type === 'w') { propW -= dx; }
        else if (type === 's') { propH += dy; }
        else if (type === 'n') { propH -= dy; }

        let maxW = canvasSize;
        let maxH = canvasSize;
        if (type === 'se' || type === 'e') { maxW = canvasSize - startCrop.x; }
        else if (type === 'nw' || type === 'w' || type === 'sw') { maxW = startCrop.x + startCrop.w; }
        else if (type === 'ne') { maxW = canvasSize - startCrop.x; }

        if (type === 'se' || type === 'sw' || type === 's') { maxH = canvasSize - startCrop.y; }
        else if (type === 'nw' || type === 'ne' || type === 'n') { maxH = startCrop.y + startCrop.h; }

        propW = Math.max(minSize, Math.min(propW, maxW));
        propH = Math.max(minSize, Math.min(propH, maxH));

        if (type === 'se' || type === 'ne' || type === 'e') {
          if (!initialSnap.right && Math.abs((startCrop.x + propW) - (imgX + w)) < snapThresh) propW = (imgX + w) - startCrop.x;
        }
        if (type === 'nw' || type === 'sw' || type === 'w') {
          if (!initialSnap.left && Math.abs((startCrop.x + startCrop.w - propW) - imgX) < snapThresh) propW = startCrop.x + startCrop.w - imgX;
        }
        if (type === 'se' || type === 'sw' || type === 's') {
          if (!initialSnap.bottom && Math.abs((startCrop.y + propH) - (imgY + h)) < snapThresh) propH = (imgY + h) - startCrop.y;
        }
        if (type === 'nw' || type === 'ne' || type === 'n') {
          if (!initialSnap.top && Math.abs((startCrop.y + startCrop.h - propH) - imgY) < snapThresh) propH = startCrop.y + startCrop.h - imgY;
        }

        propW = Math.max(minSize, Math.min(propW, maxW));
        propH = Math.max(minSize, Math.min(propH, maxH));
        
        newW = propW;
        newH = propH;

        newX = startCrop.x;
        newY = startCrop.y;
        if (type === 'nw' || type === 'sw' || type === 'w') {
          newX = startCrop.x + startCrop.w - newW;
        }
        if (type === 'nw' || type === 'ne' || type === 'n') {
          newY = startCrop.y + startCrop.h - newH;
        }
      }
    }

    setCropBox({ x: newX, y: newY, w: newW, h: newH });
    setCanSave(true);
  }, [imageState, isSquareCrop]);

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (stampDragState.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      stampDragState.current = null;
    }
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

  useEffect(() => {
    setCropBox((prev) => {
      if (isSquareCrop && prev && prev.w !== prev.h) {
        const minDim = Math.min(prev.w, prev.h);
        return { ...prev, w: minDim, h: minDim };
      }
      return prev;
    });
  }, [isSquareCrop]);

  return (
    <div 
      className="flex flex-col min-h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans relative"
      style={{
        background: 'radial-gradient(circle at top left, #1e293b, #020617), radial-gradient(circle at bottom right, #1e1b4b, #020617)'
      }}
    >
      {!(imageState && !previewDataUrl) && (
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white/5 backdrop-blur-xl border-b border-white/10 z-50 shrink-0">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}SakanaTrimming.jpg`} alt="SakanaTrimming" className="h-10 w-auto rounded-lg object-contain" />
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              SakanaTrimming
            </h1>
          </div>
        </header>
      )}

      {imageState && !previewDataUrl && (
        <div className="flex flex-col items-center gap-3 py-3 px-4 bg-[#0f172a] border-b border-white/10 shrink-0 z-40 w-full overflow-x-auto">
          {/* 上段：基本設定 */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 w-full">
            <label className="flex items-center gap-2 cursor-pointer bg-black/30 px-3 py-1.5 rounded-full border border-white/10 hover:bg-black/50 transition-colors shrink-0">
              <input 
                type="checkbox" 
                checked={isSquareCrop} 
                onChange={(e) => setIsSquareCrop(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-white/20 bg-black/30 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">選択範囲を正方形に固定</span>
            </label>

            <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-black/30 rounded-full border border-white/10 shrink-0">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">背景色</label>
              <button
                onClick={() => setIsEyedropperActive(!isEyedropperActive)}
                className={`p-1.5 rounded-md transition-colors ${isEyedropperActive ? 'bg-blue-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                title="画像から色を抽出"
              >
                <Pipette className="w-4 h-4" />
              </button>
              <div className="flex items-center">
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
                  {!Object.values(COLORS).includes(bgColor) && (
                    <option value={bgColor} className="bg-slate-800 text-white">カスタム</option>
                  )}
                </select>
                <label className="cursor-pointer ml-2 flex items-center">
                  <div className="w-5 h-5 rounded-full border border-white/40 shadow-inner" style={{ backgroundColor: bgColor }} />
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => {
                      setBgColor(e.target.value.toUpperCase());
                      setCanSave(true);
                    }}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 下段：メッセージ追加 */}
          <fieldset className="w-full min-w-0 max-w-lg border border-white/20 rounded-xl px-2 sm:px-4 pb-3 pt-1 mt-1 mb-2">
            <legend className="text-xs font-semibold text-slate-400 px-2 uppercase tracking-wider">メッセージ</legend>
            <div className="flex flex-row items-center gap-1.5 sm:gap-2 w-full mt-1">
              <input
                type="text"
                value={stampInput}
                onChange={(e) => setStampInput(e.target.value)}
                className="flex-1 w-full min-w-[80px] h-9 bg-slate-800/50 text-white px-2 sm:px-3 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500/50 border border-white/10 text-sm placeholder-slate-500"
                placeholder="文字を入力..."
              />
              
              <div className="flex items-center shrink-0 bg-black/20 h-9 px-1.5 sm:px-2 rounded-md border border-white/10">
                <select
                  value={stampColor}
                  onChange={(e) => setStampColor(e.target.value)}
                  className="bg-transparent text-sm focus:outline-none cursor-pointer text-slate-100 w-10 sm:w-16"
                >
                  {Object.entries(COLORS).map(([name, hex]) => (
                    <option key={name} value={hex} className="bg-slate-800 text-white">{name}</option>
                  ))}
                  {!Object.values(COLORS).includes(stampColor) && (
                    <option value={stampColor} className="bg-slate-800 text-white">ｶｽﾀﾑ</option>
                  )}
                </select>
                <label className="cursor-pointer ml-1 flex items-center">
                  <div className="w-5 h-5 rounded-full border border-white/40 shadow-inner" style={{ backgroundColor: stampColor }} />
                  <input
                    type="color"
                    value={stampColor}
                    onChange={(e) => setStampColor(e.target.value.toUpperCase())}
                    className="sr-only"
                  />
                </label>
              </div>
              
              <button
                onClick={() => {
                  const text = stampInput.trim() || '🐟';
                  addStamp(text, stampColor);
                }}
                className="shrink-0 px-3 sm:px-5 py-2 h-9 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-full transition-colors whitespace-nowrap shadow-lg shadow-blue-600/20"
              >
                {stamp ? '変更' : '追加'}
              </button>
            </div>
          </fieldset>
        </div>
      )}

      <main className="flex-grow relative flex flex-col items-center justify-center p-4 sm:p-12 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        {previewDataUrl ? (
          <div className="relative z-10 w-full max-w-[80vh] sm:max-w-[400px] mx-auto flex flex-col items-center select-none">
            <h2 className="text-xl font-bold mb-4 text-white">プレビュー</h2>
            <div className="w-full aspect-square rounded-sm overflow-hidden flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10">
              <img src={previewDataUrl} alt="Preview" className="w-full h-full object-contain" />
            </div>
            
            <div className="flex items-center justify-center gap-3 sm:gap-4 w-full mt-6 sm:mt-8">
              <button
                onClick={() => setPreviewDataUrl(null)}
                className="px-4 py-2.5 text-sm font-medium hover:bg-white/5 rounded-lg transition-colors border border-transparent flex items-center gap-1.5 text-slate-300"
              >
                <X className="w-4 h-4" />
                <span>戻る</span>
              </button>
              
              <button
                onClick={downloadPreview}
                className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-all border flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20 border-green-400/20"
              >
                <Download className="w-4 h-4" />
                <span>保存</span>
              </button>
            </div>
          </div>
        ) : !imageState ? (
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
                    width: `${(cropBox.w / imageState.canvasSize) * 100}%`,
                    height: `${(cropBox.h / imageState.canvasSize) * 100}%`,
                    left: `${(cropBox.x / imageState.canvasSize) * 100}%`,
                    top: `${(cropBox.y / imageState.canvasSize) * 100}%`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                    border: '2px solid #3b82f6'
                  }}
                  onPointerDown={(e) => onPointerDown(e, 'move')}
                >
                  <div className="absolute inset-0 pointer-events-none border border-blue-500/40 m-auto w-1/3 h-full" />
                  <div className="absolute inset-0 pointer-events-none border border-blue-500/40 m-auto w-full h-1/3" />

                  {(['n', 's', 'e', 'w'] as const).map((type) => {
                    const isV = type === 'n' || type === 's';
                    return (
                      <div
                        key={type}
                        className="absolute touch-none"
                        style={{
                          top: type === 'n' ? '-20px' : type === 's' ? 'calc(100% - 20px)' : '40px',
                          left: type === 'w' ? '-20px' : type === 'e' ? 'calc(100% - 20px)' : '40px',
                          right: isV ? '40px' : 'auto',
                          bottom: !isV ? '40px' : 'auto',
                          width: isV ? 'auto' : '40px',
                          height: isV ? '40px' : 'auto',
                          cursor: isV ? 'ns-resize' : 'ew-resize',
                          zIndex: 10,
                        }}
                        onPointerDown={(e) => onPointerDown(e, type)}
                      />
                    );
                  })}
                  {(['nw', 'ne', 'sw', 'se'] as const).map((type) => (
                    <div
                      key={type}
                      className="absolute w-20 h-20 flex items-center justify-center -ml-10 -mt-10 touch-none z-20"
                      style={{
                        top: type.includes('n') ? '0%' : '100%',
                        left: type.includes('w') ? '0%' : '100%',
                        cursor: `${type}-resize`
                      }}
                      onPointerDown={(e) => onPointerDown(e, type)}
                    >
                      <div className="w-4 h-4 bg-blue-500 rounded-full shadow-lg pointer-events-none" />
                    </div>
                  ))}
                </div>
              )}

              {stamp && (
                <div
                  className="absolute z-[60] touch-none group flex items-center justify-center"
                  style={{
                    left: `${(stamp.x / imageState.canvasSize) * 100}%`,
                    top: `${(stamp.y / imageState.canvasSize) * 100}%`,
                    width: `${15 * stamp.scale}%`,
                    height: `${15 * stamp.scale}%`,
                    transform: `translate(-50%, -50%) rotate(${stamp.angle}deg)`,
                  }}
                  onPointerDown={(e) => handleStampPointerDown(e, 'move')}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md overflow-visible">
                    <text x="50" y="50" fontSize="80" textAnchor="middle" dominantBaseline="central" fill={stamp.color} fontWeight="bold" style={{ userSelect: 'none' }}>
                      {stamp.text}
                    </text>
                  </svg>
                  <button
                    className="absolute -top-4 -right-4 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-[.touch-none]:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity border-2 border-white cursor-pointer"
                    onPointerDown={(e) => { e.stopPropagation(); setStamp(null); }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div
                    className="absolute -bottom-4 -right-4 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-[.touch-none]:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-nwse-resize border-2 border-white"
                    onPointerDown={(e) => handleStampPointerDown(e, 'scaleRotate')}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}

              {isEyedropperActive && (
                <div 
                  className="absolute inset-0 z-50 cursor-crosshair touch-none" 
                  onPointerDown={handleEyedropperPointerDown}
                  onPointerMove={handleEyedropperPointerMove}
                  onPointerUp={handleEyedropperPointerUp}
                  onPointerCancel={handleEyedropperPointerUp}
                  title="ドラッグして色を取得"
                />
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
                onClick={executeCrop}
                disabled={!canSave}
                className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all border flex items-center gap-2 ${
                  canSave 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 border-blue-400/20'
                    : 'bg-white/10 text-slate-400 cursor-not-allowed border-transparent shadow-none'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>トリミングを実行</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {imageState && !previewDataUrl && (
        <footer className="h-12 px-4 sm:px-6 hidden sm:flex items-center justify-center sm:justify-start bg-white/5 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500 uppercase tracking-widest">
            <span>Canvas: {cropBox?.w ? Math.round(cropBox.w) : '-'} x {cropBox?.h ? Math.round(cropBox.h) : '-'}px</span>
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
