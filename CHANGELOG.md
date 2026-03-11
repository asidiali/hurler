# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.4] - 2026-03-10

### Added
- Confirmation dialogs before deleting requests or environments (#57)

## [0.9.3] - 2026-03-10

### Fixed
- Red unsaved dot no longer appears incorrectly when selecting a file (#55)
- Undoing all changes now clears the unsaved indicator

## [0.9.2] - 2026-03-10

### Added
- Auto-save captures to environment variables (#52)
  - When a request runs with captures, values are automatically saved to the current environment
  - Captured variables can be used immediately in subsequent requests via `{{varName}}`
  - Toast notification shows count and environment name (e.g., "2 captures saved to production")
  - Works even when request fails (e.g., assertion failure) as long as captures succeeded

## [0.9.1] - 2026-03-10

### Added
- Hover over environment variables to see their value in a tooltip (#53)
- Secrets show masked value (••••••••) for security

## [0.9.0] - 2026-03-10

### Added
- Read-only mode via `--read-only` CLI flag (#47)
  - Disables editing, creating, and deleting requests
  - Disables environment modifications
  - Shows "read-only" badge in app header with tooltip
  - Running requests still works

## [0.8.4] - 2026-03-10

### Fixed
- Env settings modal now opens with the currently active environment selected (#48)

## [0.8.3] - 2026-03-10

### Fixed
- Variable highlighting and autocomplete now updates immediately when environment variables are added/changed (#46)

## [0.8.2] - 2026-03-10

### Changed
- Unsaved changes now clear on page refresh/close (load fresh from file)
- Red dot indicator shows next to files with unsaved changes in sidebar (#43)

### Fixed
- Sidebar file names properly truncate when overflowing

## [0.8.1] - 2026-03-10

### Added
- Project directory name shown in header bar instead of static "Hurler" (#37)
- Document title updates to `<project> | Hurler` format
- Unsaved changes persist when navigating between files (#36)
  - Changes stored in sessionStorage
  - Restored when returning to a file
  - Browser warns before closing with unsaved changes

### Fixed
- Request sidebar now scrolls when content overflows (#38)

## [0.8.0] - 2026-03-10

### Added
- Variable highlighting in URL, headers, and body (#34)
  - Defined variables show in emerald green
  - Undefined variables show in rose red with wavy underline
- Variable autocomplete triggered by typing `{{`
  - Shows matching environment variables and secrets
  - Labels distinguish "environment variable" vs "environment secret"
  - Keyboard navigation (arrows, tab/enter to select, escape to close)
  - Smart brace handling - won't duplicate existing `}}`
- EnvContext for centralized environment variable state

## [0.7.2] - 2026-03-10

### Fixed
- Manage Environments modal body now scrolls properly (#32) - long lists of variables/secrets no longer overflow and cover the save button

## [0.7.1] - 2026-03-09

### Added
- JSON Format button in visual editor body section - pretty-prints JSON with 2-space indent
- Toast notifications (via Sonner) - shows error details when JSON formatting fails

### Fixed
- Sanitize invisible whitespace characters in request body (#30) - NBSP, zero-width spaces, and other hidden Unicode characters that break JSON parsing are now automatically removed/replaced

## [0.7.0] - 2026-02-20

### Added
- HTTP method badges in sidebar (#24) - color-coded badges (GET, POST, PUT, etc.) next to request names
- Drag-and-drop section reordering (#25) - sections can now be reordered via grip handle

### Changed
- Manage Environments modal is now wider (#26) for better visibility of key/value inputs

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
