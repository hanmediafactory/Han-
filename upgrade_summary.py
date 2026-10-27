with open('src/screens/HomeScreen.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_m = '<section className="workspace-summary"'
end_m = '</section>'

if start_m in text:
    p1, r = text.split(start_m, 1)
    _, p2 = r.split(end_m, 1)
    new_s = '''<section
          className="workspace-summary grid grid-cols-3 lg:grid-cols-4 gap-3 p-4 lg:p-5 rounded-xl bg-surface-elevated/80 border border-border-subtle shadow-sm"
          aria-label="Workspace at a glance"
        >
          <div
            className="cursor-pointer group"
            onClick={() => { switchTab("work"); navigateTo("projects"); }}
          >
            <span className="text-text-secondary group-hover:text-text-primary transition-colors">Active projects</span>
            <strong className="font-mono text-2xl lg:text-3xl font-bold text-text-primary">{activeProjects.length}</strong>
            <small className="text-text-muted">In motion</small>
          </div>

          <div
            className="cursor-pointer group"
            onClick={() => { switchTab("work"); navigateTo("tasks"); }}
          >
            <span className="text-text-secondary group-hover:text-text-primary transition-colors">Open tasks</span>
            <strong className="font-mono text-2xl lg:text-3xl font-bold text-text-primary">{tasks.filter(task => !task.completed && task.status !== "CANCELLED").length}</strong>
            <small className="text-text-muted">To move forward</small>
          </div>

          <div
            className="cursor-pointer group"
            onClick={() => { switchTab("work"); navigateTo("tasks"); }}
          >
            <span className="text-text-secondary group-hover:text-text-primary transition-colors">Done today</span>
            <strong className="font-mono text-2xl lg:text-3xl font-bold text-text-primary">{todayTasks.filter(task => task.completed).length}</strong>
            <small className="text-text-muted">Of {todayTasks.length| scheduled</small>
          </div>

          <div
            className="hidden lg:flex flex-col cursor-pointer group"
            onClick={() => { switchTab("work"); navigateTo(overdueProjects.length > 0 ? "projects" : "tasks", "Overdue"); }}
          >
            <span className="flex items-center gap-1.5 text-text-secondary group-hover:text-text-primary transition-colors">
              {overdueCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
              Overdue work
            </span>
            <strong className={`font-mono text-2xl lg:text-3xl font-bold ${overdueCount > 0 ? 'text-rose-400' : 'text-text-primary'}`}>
              {overdueCount}
            </strong>
            <small className="text-text-muted">
              {overdueCount > 0 ? "Requires attention" : "All clear"}
            </small>
          </div>

        </section>'''
    with open('src/screens/HomeScreen.tsx', 'w', encoding='utf-8') as f:
        f.write(p1 + new_s + p2)
    print('workspace-summary upgraded successfully!')
else:
    print('start_m not found')
