with open('src/components/ui/ScreenHeader.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("title === 'Projects'%? 'project'", "title === 'Projects' ? 'project'")
with open('src/components/ui/ScreenHeader.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('T^¦PosFixed!')
