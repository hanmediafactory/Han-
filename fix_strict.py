with open('src/screens/HomeScreen.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("const canManageTasks = can('tasks.manage') || isFounder;", "const canManageTasks = can('tasks.manage');")
with open('src/screens/HomeScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Successfully restored strict perms')
