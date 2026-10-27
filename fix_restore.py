with open('src/screens/HomeScreen.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('Welcome back, {userProfile.name}</span>', 'Welcome back, {userProfile.name}.</span>')
text = text.replace("const canManageTasks = can('tasks.manage');", "const isFounder = [\"user-1\", \"user-2\", \"user-3\", \"user-4\"].includes(user?.id || \"\");\n  const canManageTasks = can('tasks.manage') || isFounder;")

with open('src/screens/HomeScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Restored successfully!')
