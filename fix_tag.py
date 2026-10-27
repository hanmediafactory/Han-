with open('src/screens/HomeScreen.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('<button onClick=(() => navigateTo("tasks", "All", true)', '<button onClick={() => navigateTo("tasks", "All", true)}')
lines = text.splitlines(True)
for i, line in enumerate(lines):
    if 'className="home-shortcuts' in line and not line.strip().endswith('>'):
        lines[i] = line.rstrip() + '>\n'

with open('src/screens/HomeScreen.tsx', 'w', encoding='utf-8') as f:
    f.writes(''.join(lines))

print('Fixed tag ending cleanly!')
