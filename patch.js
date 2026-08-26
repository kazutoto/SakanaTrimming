const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update pointer move logic for type === 'move'
code = code.replace(
  /newX = Math\.max\(0, Math\.min\(newX, canvasSize - startCrop\.w\)\);\n\s*newY = Math\.max\(0, Math\.min\(newY, canvasSize - startCrop\.h\)\);/,
  `if (isSplitGeneration) {
        newX = Math.max(imgX, Math.min(newX, imgX + w - startCrop.w));
        newY = Math.max(imgY, Math.min(newY, imgY + h - startCrop.h));
      } else {
        newX = Math.max(0, Math.min(newX, canvasSize - startCrop.w));
        newY = Math.max(0, Math.min(newY, canvasSize - startCrop.h));
      }`
);

// Update pointer move logic for type !== 'move'
code = code.replace(
  /let maxW = canvasSize;\n\s*let maxH = canvasSize;\n\n\s*if \(type === 'se' \|\| type === 'e'\) \{ maxW = canvasSize - startCrop\.x; \}\n\s*else if \(type === 'nw' \|\| type === 'w' \|\| type === 'sw'\) \{ maxW = startCrop\.x \+ startCrop\.w; \}\n\s*else if \(type === 'ne'\) \{ maxW = canvasSize - startCrop\.x; \}\n\n\s*if \(type === 'se' \|\| type === 'sw' \|\| type === 's'\) \{ maxH = canvasSize - startCrop\.y; \}\n\s*else if \(type === 'nw' \|\| type === 'ne' \|\| type === 'n'\) \{ maxH = startCrop\.y \+ startCrop\.h; \}/,
  `let maxW = canvasSize;
        let maxH = canvasSize;

        if (isSplitGeneration) {
          if (type === 'se' || type === 'e') { maxW = imgX + w - startCrop.x; }
          else if (type === 'nw' || type === 'w' || type === 'sw') { maxW = startCrop.x + startCrop.w - imgX; }
          else if (type === 'ne') { maxW = imgX + w - startCrop.x; }

          if (type === 'se' || type === 'sw' || type === 's') { maxH = imgY + h - startCrop.y; }
          else if (type === 'nw' || type === 'ne' || type === 'n') { maxH = startCrop.y + startCrop.h - imgY; }
        } else {
          if (type === 'se' || type === 'e') { maxW = canvasSize - startCrop.x; }
          else if (type === 'nw' || type === 'w' || type === 'sw') { maxW = startCrop.x + startCrop.w; }
          else if (type === 'ne') { maxW = canvasSize - startCrop.x; }

          if (type === 'se' || type === 'sw' || type === 's') { maxH = canvasSize - startCrop.y; }
          else if (type === 'nw' || type === 'ne' || type === 'n') { maxH = startCrop.y + startCrop.h; }
        }`
);

// Update dependencies for onPointerMove
code = code.replace(
  /setCropBox\(\{ x: newX, y: newY, w: newW, h: newH \}\);\n\s*setCanSave\(true\);\n\s*\}, \[imageState, isEffectiveSquareCrop\]\);/,
  `setCropBox({ x: newX, y: newY, w: newW, h: newH });
    setCanSave(true);
  }, [imageState, isEffectiveSquareCrop, isSplitGeneration]);`
);

// Update useEffect for cropbox constraints
code = code.replace(
  /useEffect\(\(\) => \{\n\s*setCropBox\(\(prev\) => \{\n\s*if \(isEffectiveSquareCrop && prev && prev\.w !== prev\.h\) \{\n\s*const minDim = Math\.min\(prev\.w, prev\.h\);\n\s*return \{ \.\.\.prev, w: minDim, h: minDim \};\n\s*\}\n\s*return prev;\n\s*\}\);\n\s*\}, \[isEffectiveSquareCrop\]\);/,
  `useEffect(() => {
    setCropBox((prev) => {
      if (!prev) return prev;
      let newW = prev.w;
      let newH = prev.h;
      let newX = prev.x;
      let newY = prev.y;

      if (isEffectiveSquareCrop && prev.w !== prev.h) {
        const minDim = Math.min(prev.w, prev.h);
        newW = minDim;
        newH = minDim;
      }

      if (isSplitGeneration && imageState) {
        const { imgX, imgY, w: imgW, h: imgH } = imageState;
        
        if (newW > imgW) newW = imgW;
        if (newH > imgH) newH = imgH;
        
        if (newX < imgX) newX = imgX;
        if (newY < imgY) newY = imgY;
        if (newX + newW > imgX + imgW) newX = imgX + imgW - newW;
        if (newY + newH > imgY + imgH) newY = imgY + imgH - newH;
      }

      if (newW !== prev.w || newH !== prev.h || newX !== prev.x || newY !== prev.y) {
        return { x: newX, y: newY, w: newW, h: newH };
      }
      return prev;
    });
  }, [isEffectiveSquareCrop, isSplitGeneration, imageState]);`
);

fs.writeFileSync('src/App.tsx', code);
