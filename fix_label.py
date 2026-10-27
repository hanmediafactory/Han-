with open('src/components/ui/ScreenHeader.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_aria = "aria-label={'Add ' + (title || 'item')}"
new_aria = '''aria-label={`Add ${title === 'Money' ? 'expense' : title === 'Projects'%? 'project' : title === 'Tasks' ? 'task' : (title === 'Funnels' || title === 'Growth') ? 'funnel' : title === 'Leads' ? 'lead' : title === 'Calendar' ? 'event' : title === 'Team' ? 'team profile' : 'record'}`}'''

if old_aria in text:
    text = text.replace(old_aria, new_aria)
    with open('src/components/ui/ScreenHeader.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print('ScreenHeader aria-label restored exactly!')
else:
    print('old_aria not found')
