# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`claude-switch-provider-cli` is a single-file CLI tool (`index.ts`) that manages and switches between different LLM API providers for Claude Code. It reads provider configs from `key.local.json` and writes environment variables to `~/.claude/settings.json`.

The binary is `claude-env`, registered via `package.json#bin`.

## Commands

```sh
bun install          # Install dependencies
bun run index.ts     # Run the CLI directly
bun link             # Install `claude-env` globally from this directory
```

## CLI Commands (what the tool exposes)

```sh
claude-env list                  # List all env vars in ~/.claude/settings.json
claude-env get <key>             # Get a specific env var
claude-env set <key> <value>     # Set an env var
claude-env remove <key>          # Remove an env var
claude-env clear [-y]            # Clear all env vars (prompts unless -y)
claude-env providers             # List providers from key.local.json
claude-env use [provider]        # Switch to a provider (interactive if omitted)
```

## Architecture

The entire implementation lives in `index.ts` (~228 lines). There are no submodules.

**Key paths (hardcoded in index.ts):**
- `KEY_JSON_PATH` — `./key.local.json` (relative to the script's directory), gitignored, contains real API credentials
- `key.json` — committed template showing the expected shape of `key.local.json`
- `SETTINGS_PATH` — `~/.claude/settings.json`, where Claude Code reads its env vars

**Provider config shape** (in `key.local.json`):
```json
{
  "providers": {
    "<name>": {
      "env": {
        "ANTHROPIC_AUTH_TOKEN": "...",
        "ANTHROPIC_BASE_URL": "...",
        "ANTHROPIC_MODEL": "...",
        ...
      }
    }
  }
}
```

The `use` command merges provider env vars into `settings.json` under the `env` key, replacing any existing values.

## Bun Usage

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install` or `yarn`
- Use `bunx <package>` instead of `npx <package>`
- Bun automatically loads `.env` — don't use dotenv
- Prefer `Bun.file` over `node:fs` readFile/writeFile
- Use `Bun.$\`cmd\`` instead of execa
