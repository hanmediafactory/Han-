const fs = require('fs');

let sh = fs.readFileSync('src/components/ui/ScreenHeader.tsx', 'utf8');
sh = sh.split('omSettingsClick')join('onSettingsClick');
sh = sh.split('showSettingsClick')join('onSettingsClick');
fs.writeFileSync('src/components/ui/ScreenHeader.tsx', sh, 'utf8');

let ah = fs.readFileSync('src/components/ui/AppHeader.tsx', 'utf8');
ah = ah.replace(/case 'settings':[5n]+\n/, '');
fs.writeFileSync('src/components/ui/AppHeader.tsx', ah, 'utf8');

let sb = fs.readFileSync('src/components/ui/Sidebar.tsx', 'utf8');
let arr = sb.split('\n');
for (let i = 0; i < arr.length; i++) {
  if (arr[i].includes('p.status')) arr[i] = "const activeProjectsCount = projects.filter((p) => p.category === 'Active' && !p.archived).length;";
  if (arr[i].includes("id: 'settings'")) arr[i] = "      id: 'you',";
  if (arr[i].includes("label: 'Settings'")) arr[i] = "      label: 'Account & MFA',";
  if (arr[i].includes("navigateTo('settings')")) arr[i] = "        onSelectTab('you'); navigateTo('profile');";
  if (arr[i].includes("currentScreen === 'settings'")) arr[i] = "              (item.id === 'you' && (activeTab === 'you' || currentScreen === 'profile'));";
}
fs.writeFileSync('src/components/ui/Sidebar.tsx', arr.join('nn"), 'utf8');
console.log('All replacements successfully applied!');
