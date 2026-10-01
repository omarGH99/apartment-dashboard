# Contributing

Thanks for your interest in improving Apartment Dashboard! Bug reports, ideas and pull requests are all welcome.

## Getting set up

Requires **Node 22+** (see [`.nvmrc`](.nvmrc)).

```bash
git clone https://github.com/omarGH99/apartment-dashboard.git
cd apartment-dashboard
npm install
npm run dev
```

## Before you open a pull request

Run the same checks CI runs:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Formatting is handled by Prettier (`npm run format`). An `.editorconfig` is included for your editor.

## Guidelines

- **Keep PRs focused.** One feature or fix per PR, with a clear description of what and why.
- **Add tests** for logic changes: reducer actions and selectors live in `src/context/store.ts` and `src/utils/stats.ts` and are tested in `src/test/`.
- **Keep the demo self-contained.** No backend, and no real personal data. All seed data must stay fictional.
- **Accessibility matters.** Use semantic elements, label form fields, keep keyboard navigation working, and check both light and dark themes.
- **Update docs.** If you change behaviour, update the README. If you change the UI noticeably, regenerate screenshots with `npm run screenshots`.

## Commit messages

Short, imperative subject lines are preferred, for example `Add CSV export to payments`. Conventional Commits (`feat:`, `fix:`, `docs:`) are welcome but not required.

## Reporting bugs and requesting features

Use the [issue templates](https://github.com/omarGH99/apartment-dashboard/issues/new/choose). For security problems, please follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
