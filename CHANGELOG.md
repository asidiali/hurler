# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.7] - 2026-02-19

### Fixed
- Add Header/Capture/Assert buttons now work in visual editor (#22)

## [0.6.6] - 2026-02-19

### Fixed
- Fix duplicate environments in selector (#20) - `.secrets.env` files no longer show as separate environments

## [0.6.5] - 2026-02-19

### Fixed
- Fix dist path for npm package

## [0.6.4] - 2026-02-19

### Fixed
- npm publish workflow fix

## [0.6.3] - 2026-02-19

### Fixed
- npm publish workflow fix

## [0.6.2] - 2026-02-19

### Changed
- Switch to npm trusted publisher (OIDC) for automated releases

## [0.6.1] - 2026-02-19

### Added
- GitHub Action for automated npm publishing on release

## [0.6.0] - 2026-02-19

### Added
- Separate environment variables and secrets (#18, #19)
  - Variables stored in `{name}.env` (safe to commit)
  - Secrets stored in `{name}.secrets.env` (gitignored)
- Environment editor UI now has distinct sections for Variables and Secrets
- Secrets are masked by default with toggle to show/hide values
- Info tooltips explaining what each section is for

## [0.5.0] - 2026-02-10

### Added
- Ability to rename hurl files via sidebar menu with rename modal (#16)

## [0.4.0] - 2026-02-10

### Added
- "Captures" tab in response pane showing captured values when request has captures (#14)

## [0.3.2] - 2026-02-10

### Fixed
- "Ungrouped" sidebar section now hidden when all files are assigned to sections (#12)

## [0.3.1] - 2026-02-10

### Fixed
- Code editors no longer overflow past container width (#10)
- Added line wrapping for long lines in editors

## [0.3.0] - 2026-02-10

### Added
- System theme support - app now respects `prefers-color-scheme` for light/dark mode
- Light theme for code editors - proper light styling when in light mode
- Real-time theme switching when system preference changes

## [0.2.0] - 2026-02-10

### Added
- Visual body editor now uses CodeMirror with syntax highlighting, line numbers, and bracket matching (#1)
- Support for `[Captures]` section in visual editor - captures no longer break asserts display (#2)
- Startup check for hurl installation with helpful error message and installation link (#5)
- Tab key support for indentation in body editor

### Fixed
- Page title changed from "hurler-temp" to "Hurler" (#6)

## [0.1.0] - 2026-02-10

### Added
- Initial release
- Web-based GUI for managing Hurl HTTP request collections
- Visual editor for .hurl files
- Environment management with .env files
- Request execution with response display
- Collections with sections and groups
- Dark theme UI
