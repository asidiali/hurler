# Hurler

A GUI for managing and running [Hurl](https://hurl.dev) HTTP request collections.

Run `npx hurler` in any project directory to get a web-based interface for organizing `.hurl` files, managing environments, and executing requests.

## Quick Start

```
npx hurler
```

This starts a local server at `http://localhost:4000` and stores data in a `.hurl/` directory in your current working directory.

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Hurl](https://hurl.dev/docs/installation.html) (for running requests)

## Usage

```
npx hurler [options]
```

### Options

| Flag | Description |
|---|---|
| `--port`, `-p` | Port to run the server on (default: `4000`) |
| `--open` | Open the browser automatically |

You can also set the port via the `PORT` environment variable.

### Examples

```sh
npx hurler                  # start on port 4000
npx hurler -p 8080          # start on port 8080
npx hurler --open           # start and open browser
```

## Data Storage

All data is stored in `.hurl/` relative to where you run the command:

```
.hurl/
├── collections/    # .hurl request files
├── environments/   # .env variable files
└── metadata.json   # UI organization (sections, groups)
```

This directory is safe to commit to version control if you want to share collections with your team.

## License

MIT
