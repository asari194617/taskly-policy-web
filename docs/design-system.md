# Design system

The policy site uses the Digital Agency Design System (DADS) as its component and token source.

- Official npm packages: `@digital-go-jp/design-tokens` for CSS variables and `@digital-go-jp/tailwind-theme-plugin` for the utility classes used by the snippets.
- Official React code snippets: `Button`, `Breadcrumbs`, `Disclosure`, `Heading`, `Link`, and `Slot` are vendored in [`components/dads`](../components/dads/README.md) at a pinned upstream commit under the MIT license. The official React components are distributed as snippets rather than as an npm package.
- Site-specific composition: the Taskly logo, policy index, edition metadata, article layout, revision history, and diff table are application code. They use DADS tokens and snippets for general controls.
- Dark theme: DADS's official primitive palette is mapped to semantic site colors in `app/styles.css`. The page follows the operating system's `prefers-color-scheme` setting. This is a site adaptation, not an official DADS dark theme.

When updating the snippets, check the upstream commit and MIT license, copy only the components in use, run the full tests, and attach desktop and mobile screenshots to the PR.

The app's 80% unit coverage gate excludes the unmodified upstream snippet internals, as it does other third-party dependencies. The browser E2E suite exercises navigation, revision diffs, operating system theme changes, and mobile disclosure in the integrated site.
