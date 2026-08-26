const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /let maxW = canvasSize;\n\s*let maxH = canvasSize;\n\s*if \(type === 'se' \|\| type === 'e'\) \{ maxW = canvasSize - startCrop\.x; \}\n\s*else if \(type === 'nw' \|\| type === 'w' \|\| type === 'sw'\) \{ maxW = startCrop\.x \+ startCrop\.w; \}\n\s*else if \(type === 'ne'\) \{ maxW = canvasSize - startCrop\.x; \}\n\s*if \(type === 'se' \|\| type === 'sw' \|\| type === 's'\) \{ maxH = canvasSize - startCrop\.y; \}\n\s*else if \(type === 'nw' \|\| type === 'ne' \|\| type === 'n'\) \{ maxH = startCrop\.y \+ startCrop\.h; \}/,
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
fs.writeFileSync('src/App.tsx', code);
