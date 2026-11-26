const fs = require('fs');
let content = fs.readFileSync('src/renderer/components/Sidebar.tsx', 'utf8');
content = content.replace(
  '              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border border-input transition-colors whitespace-nowrap shrink-0"\n              size="sm"\n            >',
  '              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border border-input transition-colors whitespace-nowrap shrink-0"\n            >'
);
fs.writeFileSync('src/renderer/components/Sidebar.tsx', content);
console.log('Sidebar.tsx fixed');