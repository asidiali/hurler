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
├── environments/   # environment variable files
└── metadata.json   # UI organization (sections, groups)
```

This directory is safe to commit to version control if you want to share collections with your team.

## Environments

Hurler supports two types of environment files:

| File | Purpose | Commit to Git? |
|------|---------|----------------|
| `{name}.env` | Non-sensitive variables (URLs, feature flags, etc.) | ✅ Yes |
| `{name}.secrets.env` | Sensitive values (API keys, tokens, passwords) | ❌ No |

Both files are automatically merged when running requests. Variables from either file can be used in your `.hurl` files with `{{variable}}` syntax.

### Gitignore Setup

Add this to your `.gitignore` to keep secrets out of version control:

```
# Hurler secrets
.hurl/environments/*.secrets.env
```

### Example

```
# .hurl/environments/dev.env (safe to commit)
base_url=https://api.dev.example.com
timeout=30

# .hurl/environments/dev.secrets.env (gitignored)
api_key=sk-abc123...
auth_token=bearer-xyz...
```

Then use in your `.hurl` files:

```hurl
GET {{base_url}}/users
Authorization: Bearer {{auth_token}}
```

## License

MIT
