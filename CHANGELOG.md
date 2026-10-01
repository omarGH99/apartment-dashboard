# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-01

First public release.

### Added

- Dashboard with occupancy, rent collection, maintenance and lease-expiry stats, revenue chart and unit-status breakdown.
- Units: floor map and sortable list, with add, edit and delete.
- Tenants: lease tracking (active, expiring, expired), add tenants and end tenancies.
- Payments: monthly rent ledger, record payments with a method, undo, filters.
- Maintenance: drag-and-drop kanban board and list view, create and assign requests.
- Announcements: post, edit and delete.
- Reports: revenue trend, occupancy, maintenance by category, unit mix, CSV export and print styles.
- Global search, notification centre, dark mode, deep-linkable filters, CSV export.
- Responsive layout with a mobile navigation drawer; accessible dialogs and forms.
- Persistence in `localStorage` with a "Reset demo data" action.
- Deterministic, date-relative demo data so the demo never goes stale.
- Vitest unit and component tests, ESLint, Prettier, TypeScript, CI and GitHub Pages deploy workflows.
