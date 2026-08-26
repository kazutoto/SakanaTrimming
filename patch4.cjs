const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /if \(\!initialSnap\.left && Math\.abs\(newX - imgX\) < snapThresh\) newX = imgX;\n\s*if \(\!initialSnap\.right && Math\.abs\(newX \+ startCrop\.w - \(imgX \+ w\)\) < snapThresh\) newX = imgX \+ w - startCrop\.w;\n\s*if \(\!initialSnap\.top && Math\.abs\(newY - imgY\) < snapThresh\) newY = imgY;\n\s*if \(\!initialSnap\.bottom && Math\.abs\(newY \+ startCrop\.h - \(imgY \+ h\)\) < snapThresh\) newY = imgY \+ h - startCrop\.h;/,
  `if (!isSplitGeneration) {
        if (!initialSnap.left && Math.abs(newX - imgX) < snapThresh) newX = imgX;
        if (!initialSnap.right && Math.abs(newX + startCrop.w - (imgX + w)) < snapThresh) newX = imgX + w - startCrop.w;
        if (!initialSnap.top && Math.abs(newY - imgY) < snapThresh) newY = imgY;
        if (!initialSnap.bottom && Math.abs(newY + startCrop.h - (imgY + h)) < snapThresh) newY = imgY + h - startCrop.h;
      }`
);

code = code.replace(
  /if \(type === 'se' \|\| type === 'ne' \|\| type === 'e'\) \{\n\s*if \(\!initialSnap\.right && Math\.abs\(\(startCrop\.x \+ propW\) - \(imgX \+ w\)\) < snapThresh\) propW = \(imgX \+ w\) - startCrop\.x;\n\s*\}\n\s*if \(type === 'nw' \|\| type === 'sw' \|\| type === 'w'\) \{\n\s*if \(\!initialSnap\.left && Math\.abs\(\(startCrop\.x \+ startCrop\.w - propW\) - imgX\) < snapThresh\) propW = startCrop\.x \+ startCrop\.w - imgX;\n\s*\}\n\s*if \(type === 'se' \|\| type === 'sw' \|\| type === 's'\) \{\n\s*if \(\!initialSnap\.bottom && Math\.abs\(\(startCrop\.y \+ propH\) - \(imgY \+ h\)\) < snapThresh\) propH = \(imgY \+ h\) - startCrop\.y;\n\s*\}\n\s*if \(type === 'nw' \|\| type === 'ne' \|\| type === 'n'\) \{\n\s*if \(\!initialSnap\.top && Math\.abs\(\(startCrop\.y \+ startCrop\.h - propH\) - imgY\) < snapThresh\) propH = startCrop\.y \+ startCrop\.h - imgY;\n\s*\}/,
  `if (!isSplitGeneration) {
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
        }`
);

fs.writeFileSync('src/App.tsx', code);
