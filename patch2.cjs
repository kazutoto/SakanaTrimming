const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const iRight = Math\.min\(cx \+ splitCw, imgX \+ imgW\);\n\s*const iBottom = Math\.min\(splitCy \+ splitCh, imgY \+ imgH\);/,
  `const iRight = Math.min(cx + splitCw, cx + cw, imgX + imgW);
      const iBottom = Math.min(splitCy + splitCh, cy + ch, imgY + imgH);`
);

fs.writeFileSync('src/App.tsx', code);
