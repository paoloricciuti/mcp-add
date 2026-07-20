# mcp-add

A CLI tool to easily add [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers to various AI coding clients.

## Features

- Interactive, semi-interactive, and non-interactive modes
- Support for local (stdio) and remote (SSE/HTTP) MCP servers
- Configure multiple clients at once
- Global and project-level configuration scopes

## Supported Clients

| Client         | Global Config                                                             | Project Config          |
| -------------- | ------------------------------------------------------------------------- | ----------------------- |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) | -                       |
| Claude Code    | `~/.claude.json`                                                          | `.mcp.json`             |
| Cursor         | `~/.cursor/mcp.json`                                                      | `.cursor/mcp.json`      |
| Windsurf       | `~/.codeium/windsurf/mcp_config.json`                                     | `.windsurf/mcp.json`    |
| VS Code        | `~/.vscode/mcp.json`                                                      | `.vscode/mcp.json`      |
| OpenCode       | `~/.config/opencode/opencode.json`                                        | `opencode.json`         |
| Continue       | `~/.continue/config.yaml`                                                 | `.continue/config.yaml` |
| Goose          | `~/.config/goose/config.yaml`                                             | -                       |
| Codex          | `~/.codex/config.toml`                                                    | `.codex/config.toml`   |
| Gemini CLI     | `~/.gemini/settings.json`                                                 | `.gemini/settings.json` |

## Installation

```bash
# Using npm
npm install -g mcp-add

# Using pnpm
pnpm add -g mcp-add

# Using yarn
yarn global add mcp-add
```

Or run directly with npx:

```bash
npx mcp-add
```

## Usage

### Interactive Mode

Simply run `mcp-add` without arguments to enter interactive mode:

```bash
mcp-add
```

You'll be prompted for:

1. Server name
2. Server type (`stdio`, `http`, or `sse`)
3. Command (for `stdio`) or URL (for remote)
4. Environment variables or headers
5. Configuration scope (global or project)
6. Which clients to configure
7. OAuth client credentials when a selected remote client needs static registration

### Semi-Interactive Mode

Provide some arguments via command line and let the tool prompt for the rest:

```bash
# Provide name and type, prompt for the rest
mcp-add --name my-server --type stdio

# Provide everything except clients selection
mcp-add \
  --name filesystem \
  --type stdio \
  --command "npx -y @modelcontextprotocol/server-filesystem /tmp" \
  --scope global

# Provide name and let the tool ask for everything else
mcp-add -n my-server
```

This is useful when you want to quickly specify known values but interactively choose from options like client selection.

Adding a `-c` or `-u` will automatically infer the type.

### Non-Interactive Mode

Provide all required arguments via command line flags for fully automated usage:

```bash
# Local server example
mcp-add \
  --name my-server \
  --type stdio \
  --command "npx -y @modelcontextprotocol/server-filesystem /tmp" \
  --scope global \
  --clients "claude,cursor,vscode"

# Remote server example
mcp-add \
  --name my-remote-server \
  --type http \
  --url "https://mcp.example.com/mcp" \
  --client-id "your-static-client-id" \
  --client-secret "your-static-client-secret" \
  --headers "Authorization=Bearer token123" \
  --scope project \
  --clients "claude code,cursor"
```

Required flags for non-interactive mode:

- `--name`, `--type`, `--scope`, `--clients`
- `--command` (for `stdio` servers) or `--url` (for remote servers)

### Command Line Options

| Option            | Alias | Description                                             |
| ----------------- | ----- | ------------------------------------------------------- |
| `--name`          | `-n`  | Server name (alphanumeric, hyphens, underscores)        |
| `--type`          | `-t`  | Server type: `stdio`, `http`, or `sse`                  |
| `--command`       | `-c`  | Full command to run (`stdio` servers only)              |
| `--env`           | `-e`  | Environment variables as `KEY=value,KEY2=value2`        |
| `--url`           | `-u`  | Server URL (remote servers only)                        |
| `--headers`       | `-H`  | HTTP headers as `Key=value,Key2=value2`                 |
| `--client-id`     | -     | Static OAuth client ID for supported remote clients     |
| `--client-secret` | -     | Static OAuth client secret for supported remote clients |
| `--scope`         | `-s`  | Config scope: `global` or `project`                     |
| `--clients`       | `-C`  | Comma-separated list of clients                         |
| `--help`          | `-h`  | Show help                                               |
| `--version`       | `-v`  | Show version                                            |

`--client-id` and `--client-secret` are currently applied only to remote `claude code` and `cursor` configurations.

## Examples

### Add a filesystem MCP server to Claude Desktop

```bash
mcp-add \
  --name filesystem \
  --type stdio \
  --command "npx -y @modelcontextprotocol/server-filesystem /home/user/documents" \
  --scope global \
  --clients claude
```

### Add a GitHub MCP server with environment variables

```bash
mcp-add \
  --name github \
  --type stdio \
  --command "npx -y @modelcontextprotocol/server-github" \
  --env "GITHUB_TOKEN=ghp_xxxxxxxxxxxx" \
  --scope global \
  --clients "claude,claude code,cursor"
```

### Add a remote MCP server to a project

```bash
mcp-add \
  --name my-api \
  --type http \
  --url "https://api.example.com/mcp" \
  --client-id "cdf3737dff9d485485968e50b63fd8b4" \
  --client-secret "super-secret-value" \
  --headers "Authorization=Bearer secret,X-Custom-Header=value" \
  --scope project \
  --clients "claude code,cursor"
```

### Configure multiple clients at once

```bash
mcp-add \
  --name memory \
  --type stdio \
  --command "npx -y @modelcontextprotocol/server-memory" \
  --scope global \
  --clients "claude,claude code,cursor,windsurf,vscode,opencode"
```

## Development

```bash
# Clone the repository
git clone https://github.com/paoloricciuti/mcp-add.git
cd mcp-add

# Install dependencies
pnpm install

# Run locally
pnpm start

# Type check
pnpm run check

# Lint
pnpm run lint

# Format
pnpm run format
```

## License

MIT
