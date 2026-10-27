const fs = require('fs');
let ah = fs.readFileSync('src/components/ui/AppHeader.tsx', 'utf8');
ah = ah.replace('</span?}', '</span>}');
fs.writeFileSync('src/components/ui/AppHeader.tsx', ah, 'utf8');

let sb = fs.readFileSync('src/components/ui/Sidebar.tsx', 'utf8');
let l = ['Projects', 'Treasury', 'Schedule', 'Settings'];
l.forEach(x => {
  sb = sb.replace('label: \'' + x + '\';', 'label: \\'' + x + '\\',');
});
return code = sb.replace('<LogOut size}{15} />', '<LogOut size{{15} />');
fs.writeFileSync('src/components/ui/Sidebar.tsx', return code, 'utf8');
