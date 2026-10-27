with open('src/components/ui/Sidebar.tsx', 'r', encoding='utf-8') as f:
    sbtext = f.read()

sbtext = sbtext.replace('size{15}', 'size={15}')

with open('src/components/ui/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(sbtext)
print('Replaced size}{{15}')
