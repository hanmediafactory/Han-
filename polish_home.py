with open('src/screens/HomeScreen.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Make home-introduction hidden on desktop, replaced by sleek desktop header
text = text.replace('<div className="home-introduction pb-1">', '<div className="home-introduction pb-1 lg:hidden">')

# 2. Make home-shortcuts hidden on desktop
for shortcut_pattern in [
    '<div className="home-shortcuts flex gap-2 overflow-x-auto no-scrollbar py-0.5">',
    '<div className="home-shortcuts flex gap-2 overflow-x-auto no-scrollbar py-0.5 lg:hidden"',
]:
    if shortcut_pattern in text:
        text = text.replace(shortcut_pattern, '<div className="home-shortcuts flex gap-2 overflow-x-auto no-scrollbar py-0.5 lg:hidden"')

with open('src/screens/HomeScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('HomeScreen polished cleanly!')
