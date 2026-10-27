with open('src/styles/premium.css', 'r', encoding='utf-8') as f:
    css = f.read()

start_marker = '@media (min-width:1000px) {'
end_marker = '@media (max-height:600px)'

if start_marker in css and end_marker in css:
    p1, rest = css.split(start_marker, 1)
    _, p2 = rest.split(end_marker, 1)
    new_desktop = """@media (min-width:1024px) {
  .han-app.is-authenticated {
    max-width: 100% !important;
    width: 100% !important;
    padding-left: 240px !important;
    border-inline: none !important;
    height: 100vh !important;
    min-height: 100vh !important;
  }
  .is-authenticated .workspace-status { padding-inline: 32px; }
  .is-authenticated .home-content {
    padding: 24px 32px 64px !important;
    margin-bottom: 0 !important;
    max-width: 1600px;
    margin-inline: auto;
    width: 100%;
  }
  .is-authenticated .workspace-content {
    padding: 24px 32px 64px !important;
    margin-bottom: 0 !important;
    max-width: 1600px;
    margin-inline: auto;
    width: 100%;
  }
  .is-authenticated .workspace-content > section {
    max-width: 100% !important;
  }
  .is-authenticated .bottom-nav-bar {
    display: none !important;
  }
  .is-authenticated .quick-action-anchor {
    right: 32px !important;
    bottom: 32px !important;
    left: auto !important;
    transform: none !important;
  }
}

"""
    final_css = p1 + new_desktop + '@media (max-height:600px)' + p2
    with open('src/styles/premium.css', 'w', encoding='utf-8') as f:
        f.write(final_css)
    print('premium.css desktop query replaced cleanly!')
else:
    print('Markers not found')
