# ReleasePilot GitHub Action

![GitHub release (latest by date)](https://img.shields.io/github/v/release/felixgeelhaar/release-pilot-action)
![GitHub](https://img.shields.io/github/license/felixgeelhaar/release-pilot-action)

Official GitHub Action for [ReleasePilot](https://github.com/felixgeelhaar/release-pilot) - AI-powered release management for modern software teams.

## ✨ Zero Setup Required

**No Go, Make, or build tools needed!** Just add the action to your workflow and you're done. The action automatically:
- Downloads the correct ReleasePilot binary for your platform
- Verifies checksums for security
- Caches binaries for fast subsequent runs
- Handles all the complexity behind the scenes

## Features

- 🚀 **Automated Releases**: Complete release workflow in one step
- 📦 **Zero Dependencies**: No local tools or setup required
- 🔒 **Checksum Verification**: Ensures binary integrity
- ⚡ **Fast**: Caches binaries for subsequent runs
- 🎯 **Flexible Commands**: Run full workflow or individual steps
- 🌍 **Cross-Platform**: Supports Linux, macOS, and Windows runners

## Usage

### 🎯 Quick Start - 2 Lines of Code

Add this to your workflow - that's it! No other setup needed:

```yaml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # That's all you need! 👇
      - uses: felixgeelhaar/release-pilot-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

**What this does automatically:**
1. 📥 Downloads ReleasePilot binary (no Go/Make needed!)
2. 📊 Analyzes commits since last release
3. 🔢 Bumps version based on conventional commits
4. 📝 Generates changelog and release notes
5. ✅ Creates GitHub release with assets
6. 🎉 Done!

### Individual Commands

Run specific commands instead of the full workflow:

```yaml
- name: Plan release
  uses: felixgeelhaar/release-pilot-action@v1
  with:
    command: plan
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Bump version
  uses: felixgeelhaar/release-pilot-action@v1
  with:
    command: bump
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Generate notes
  uses: felixgeelhaar/release-pilot-action@v1
  with:
    command: notes
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Approve and publish
  uses: felixgeelhaar/release-pilot-action@v1
  id: release
  with:
    command: publish
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Use outputs
  run: |
    echo "Released version: ${{ steps.release.outputs.version }}"
    echo "Release URL: ${{ steps.release.outputs.release-url }}"
```

### Advanced Configuration

```yaml
- uses: felixgeelhaar/release-pilot-action@v1
  with:
    # Version of release-pilot to use
    version: v1.3.0  # or 'latest' (default)
    
    # Command to run
    command: full  # plan, bump, notes, approve, publish, or full (default)
    
    # GitHub token (required)
    github-token: ${{ secrets.GITHUB_TOKEN }}
    
    # Path to config file
    config: .github/release.config.yaml
    
    # Auto-approve releases
    auto-approve: true  # default
    
    # Dry run mode
    dry-run: false  # default
    
    # Working directory
    working-directory: .  # default
```

### With Custom Builds

If you build artifacts before releasing:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build
        run: make build
      
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  release:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      
      - uses: felixgeelhaar/release-pilot-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Manual Approval Workflow

Require manual approval before publishing:

```yaml
- name: Plan and prepare release
  uses: felixgeelhaar/release-pilot-action@v1
  with:
    command: notes
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Wait for approval
  uses: trstringer/manual-approval@v1
  with:
    approvers: team-leads
    
- name: Publish release
  uses: felixgeelhaar/release-pilot-action@v1
  with:
    command: publish
    auto-approve: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `version` | Version of release-pilot to use (e.g., `v1.3.0` or `latest`) | No | `latest` |
| `command` | Command to run: `full`, `plan`, `bump`, `notes`, `approve`, `publish` | No | `full` |
| `github-token` | GitHub token for creating releases | Yes | `${{ github.token }}` |
| `config` | Path to release config file | No | - |
| `auto-approve` | Automatically approve releases | No | `true` |
| `dry-run` | Run in dry-run mode | No | `false` |
| `working-directory` | Working directory for commands | No | `.` |

## Outputs

| Output | Description |
|--------|-------------|
| `version` | The new version that was created |
| `release-url` | URL of the created GitHub release |
| `tag-name` | Git tag name for the release |
| `release-id` | GitHub release ID |

## Examples

### Use Outputs in Subsequent Steps

```yaml
- uses: felixgeelhaar/release-pilot-action@v1
  id: release
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Notify Slack
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -d "text=Released version ${{ steps.release.outputs.version }}: ${{ steps.release.outputs.release-url }}"
```

### Pin to Specific Version

```yaml
- uses: felixgeelhaar/release-pilot-action@v1
  with:
    version: v1.2.4  # Pin to specific release-pilot version
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Dry Run for Testing

```yaml
- uses: felixgeelhaar/release-pilot-action@v1
  with:
    dry-run: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Requirements

- Git repository with commits following [Conventional Commits](https://www.conventionalcommits.org/)
- `release.config.yaml` configuration file (or use defaults)
- `GITHUB_TOKEN` with `contents: write` permission

## Configuration

ReleasePilot uses a `release.config.yaml` file. See the [ReleasePilot documentation](https://github.com/felixgeelhaar/release-pilot) for full configuration options.

Example minimal config:

```yaml
versioning:
  strategy: conventional

plugins:
  - name: github
    enabled: true
    config:
      assets:
        - "dist/*.tar.gz"
        - "dist/*.zip"
```

## Platform Support

The action automatically detects and downloads the correct binary for:

- **Linux**: x86_64 (amd64), aarch64 (arm64)
- **macOS**: x86_64 (Intel), aarch64 (Apple Silicon)
- **Windows**: x86_64 (amd64)

## Security

- Binaries are downloaded from official GitHub releases
- SHA256 checksums are verified for integrity
- Binaries are cached using GitHub Actions cache
- GitHub token is only used for release operations

## License

MIT License - see [LICENSE](LICENSE) for details

## Related

- [ReleasePilot CLI](https://github.com/felixgeelhaar/release-pilot) - The main CLI tool
- [Documentation](https://github.com/felixgeelhaar/release-pilot#readme) - Full documentation

## Support

- 🐛 [Report a bug](https://github.com/felixgeelhaar/release-pilot-action/issues)
- 💡 [Request a feature](https://github.com/felixgeelhaar/release-pilot-action/issues)
- 📖 [Documentation](https://github.com/felixgeelhaar/release-pilot#readme)
