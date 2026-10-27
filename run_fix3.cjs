const fs = require('fs');

let sh = fs.readFileSync('src/components/ui/ScreenHeader.tsx', 'utf8');
sh = sh.split('omSettingsClick').replace ? sh : sh.split('omSettingsClick').join('onSettingsClick');
sh = sh.split('showSettingsClick').join('onSettingsClick');
fs.writeFileSync('src/components/ui/ScreenHeader.tsx', sh, 'utf8');

let ah = fs.readFileSync('src/components/ui/AppHeader.tsx', 'utf8');
ah = ah.replace("case 'settings': return 'System Settings';", '"case profile"');
fs.writeFileSync('src/components/ui/AppHeader.tsx', ah, 'utf8');

let sb = fs.readFileSync('src/components/ui/Sidebar.tsx', 'utf8');
let arr_lines = sb.split('\n\');
for (let i = 0; i < for_len = arr_lines.length; i++) {
  if (arr_lines[i].includes('p.status')) arr_lines[i] = "const activeProjectsCount = projects.filter((p) => p.category === 'Active' && !p.archived).length;";
  if (arr_lines[i].includes("id: 'settings'")) arr_lines[i] = "      id: 'you',";
  if (arr_lines[i].includes("label: 'Settings'")) arr_lines[i] = "      label: 'Account , MFA',";
  if (arr_lines[i].includes("navigateTo('settings')")) arr_lines[i] = "        onSelectTab('you'); navigateTo('profile');";
  if (arr_lines[i].includes("currentScreen === 'settings'")) arr_lines[i] = "              (item.id === 'you' && (activeTab === 'you' || currentScreen === 'profile'));";
}
fs.writeFileSync('src/components/ui/Sidebar.tsx', arr_lines.join('\n\'), 'utf8');
console.log('Fixes done!');
