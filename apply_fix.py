with open('src/components/ui/ScreenHeader.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('omSettingsClick', 'onSettingsClick')
content = content.replace('showSettingsClick', 'onSettingsClick')
with open('src/components/ui/ScreenHeader.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/components/ui/AppHeader.tsx', 'r', encoding='utf-8') as f:
    ah = f.read()
ah = ah.replace("case 'settings': return 'System Settings';\n", "")
with open('src/components/ui/AppHeader.tsx', 'w', encoding='utf-8') as f:
    f.write(ah)

with open('src/components/ui/Sidebar.tsx', 'r', encoding='utf-8') as f:
    sb = f.read()
sb = sb.replace('p.status === \'Active\' || p.status === \'IN_PROGRESS\'', 'p.category === \'Active\' && !p.archived')
sb = sb.replace('id: _'settings\'', 'id: \'you\'')
sb = sb.replace('label: _'Settings\'', 'label: \'You & MFA\'')
sb = sb.replace("navigateTo(\'settings\')", "navigateTo(\'profile\')")
with open('src/components/ui/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(sb)
print('Updates applied successfully!')
