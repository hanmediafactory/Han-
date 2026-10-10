# Mobile optimization — 10 October 2026

Phone layouts now use larger dashboard labels, 48px creation shortcuts, 56px navigation targets, and compact 16px content gutters. Navigation, floating actions and foreground alerts account for device safe areas. Scrollable content reserves room so its final controls can be moved clear of the floating action button.

Quick Actions and form sheets scroll within the available dynamic viewport on short phones. Forms preserve 16px inputs and receive safe-area bottom padding. Desktop styles remain governed by the existing desktop breakpoint.

Validation: production build, lint and diff checks passed. Focused browser tests cover primary screens in Light, Dark and System themes at widths 320, 360, 375, 390, 400, 430, 768 and 1440; mobile navigation targets and creation shortcut sizing are explicitly checked. Browser log: mobile-optimization.log. Authenticated testing uses an isolated database. Physical-device keyboards and safe-area behavior still require a real-device check.

Results: five focused workflow tests and the login test passed initially. The expanded screen/theme test exceeded its previous 30-second allowance; with a 60-second allowance, both theme tests passed (44.6s total). Final log: mobile-theme-final.log.
