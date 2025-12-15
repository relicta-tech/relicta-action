# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Relicta Action is a GitHub Action that wraps the [Relicta CLI](https://github.com/relicta-tech/relicta) for AI-powered release management. The action downloads, caches, and executes the Relicta binary to automate releases with conventional commits, changelog generation, and AI-generated release notes.

## Development Commands

```bash
# Install dependencies
npm ci

# Build action (compiles TypeScript and bundles with ncc)
npm run build

# Format code
npm run format

# Check formatting without changes
npm run format-check

# Lint
npm run lint

# Run tests
npm run test

# Run all checks (format + lint + test + build)
npm run all
```

**Important:** The `dist/` directory must be committed. CI checks that it's up to date with `npm run build`.

## Architecture

### Source Files (`src/`)

- **main.ts** - Entry point. Parses action inputs, orchestrates installation and execution, sets outputs.
- **installer.ts** - Downloads Relicta binary from GitHub releases. Handles platform detection (Linux/macOS/Windows, x86_64/aarch64), checksum verification, archive extraction, and tool caching.
- **runner.ts** - Executes Relicta commands. Handles the `full` workflow (plan → bump → notes → approve → publish) and individual commands. Parses publish output for version/URL/tag outputs.
- **types.ts** - TypeScript interfaces for `ActionInputs`, `ActionOutputs`, `Platform`, and `DownloadInfo`.

### Build Output

Uses `@vercel/ncc` to bundle everything into `dist/index.js` for GitHub Actions runtime. The action runs on Node.js 20.

### Key Constants

- Relicta binary source: `relicta-tech/relicta` on GitHub
- Binary naming: `relicta_{OS}_{arch}.{tar.gz|zip}`
- Checksum file: `checksums.txt` in each release

## Action Inputs/Outputs

Defined in `action.yaml`. Key inputs:
- `version` - Relicta version (default: `latest`)
- `command` - `full`, `plan`, `bump`, `notes`, `approve`, `publish`
- `github-token` - Required for release operations
- `config` / `config-content` - Optional configuration (file path or inline YAML)
- `auto-approve`, `dry-run`, `working-directory`

Outputs parsed from Relicta's publish output: `version`, `release-url`, `tag-name`, `release-id`.

## CI Workflows

- **test.yaml** - Runs on push/PR to main. Tests on ubuntu/macos/windows with Node 20. Checks format, lint, build, and dist freshness.
- **e2e-test.yaml** - End-to-end tests. Creates test git history and runs plan/bump commands in dry-run mode.
- **release.yaml** - Triggered by `v*` tags. Builds and creates GitHub release with dist files.
