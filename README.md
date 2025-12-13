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

### 🤖 AI-Powered Release Notes (Zero Config!)

**Want AI-generated release notes? Just add your API key as a secret:**

```yaml
- uses: felixgeelhaar/release-pilot-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
  env:
    # Add ONE of these secrets - AI auto-enables!
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}         # OpenAI (gpt-4o-mini)
    # ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }} # Anthropic (claude-sonnet-4)
    # GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}       # Google Gemini (gemini-2.0-flash-exp)
```

**That's it!** No config file needed. ReleasePilot automatically:
- ✅ Detects your API key from environment
- ✅ Enables AI with sensible defaults
- ✅ Generates professional release notes
- ✅ Uses fast, cost-effective models by default

#### Customize AI Settings (Optional)

Override default AI settings with environment variables:

```yaml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  RELEASE_PILOT_AI_MODEL: "gpt-4o"           # Use a different model
  RELEASE_PILOT_AI_TEMPERATURE: "0.7"        # Adjust creativity
  RELEASE_PILOT_AI_TONE: "professional"      # Change tone
```

Or use a config file for full control:

```yaml
# release.config.yaml
ai:
  enabled: true
  provider: openai  # openai, anthropic, gemini, azure-openai, ollama
  api_key: ${OPENAI_API_KEY}
  model: gpt-4o
  tone: professional
  audience: developers
  temperature: 0.7
```

**Supported AI Providers:**
- **OpenAI** (OPENAI_API_KEY) - Fast, reliable, great for most use cases
- **Anthropic** (ANTHROPIC_API_KEY) - Excellent understanding of technical content
- **Google Gemini** (GEMINI_API_KEY) - Cost-effective with long context windows
- **Azure OpenAI** (AZURE_OPENAI_KEY + AZURE_OPENAI_ENDPOINT) - Enterprise-ready
- **Ollama** (OLLAMA_HOST) - Free, runs locally

### 📝 Inline Configuration (Workflow-as-Code)

**Want everything in your workflow file?** Use `config-content` for inline YAML:

```yaml
- uses: felixgeelhaar/release-pilot-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    config-content: |
      ai:
        enabled: true
        provider: openai
        api_key: ${OPENAI_API_KEY}
        model: gpt-4o
        tone: professional
        audience: developers

      versioning:
        strategy: conventional
        tag_prefix: v
        git_sign: false

      changelog:
        file: CHANGELOG.md
        format: markdown
        include_commit_hash: true

      plugins:
        - name: github
          enabled: true
          config:
            assets:
              - "dist/*.tar.gz"
              - "dist/*.zip"

        - name: slack
          enabled: true
          config:
            webhook_url: ${SLACK_WEBHOOK_URL}
            notify_on_success: true
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

**Benefits:**
- ✅ Everything in one place (workflow file)
- ✅ No separate config file in repo
- ✅ Proper YAML structure (not flattened)
- ✅ Easy to version control with workflow
- ✅ Great for monorepos with multiple release workflows

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
| `config-content` | Inline YAML configuration (alternative to config file) | No | - |
| `auto-approve` | Automatically approve releases | No | `true` |
| `dry-run` | Run in dry-run mode | No | `false` |
| `working-directory` | Working directory for commands | No | `.` |

**Note:** If both `config` and `config-content` are provided, `config-content` takes precedence.

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
- `GITHUB_TOKEN` with `contents: write` permission
- **Optional**: `release.config.yaml` for advanced configuration (uses sensible defaults otherwise)
- **Optional**: AI provider API key for AI-generated release notes

## Configuration

**Zero config required!** ReleasePilot works out of the box with sensible defaults.

### Three Ways to Configure

<table>
<tr>
<th>Approach</th>
<th>Best For</th>
<th>How It Works</th>
</tr>
<tr>
<td><strong>1. Zero-Config</strong></td>
<td>Quick start, simple projects</td>
<td>Just add API key as GitHub Secret - AI auto-enables</td>
</tr>
<tr>
<td><strong>2. Inline YAML</strong><br/>(<code>config-content</code>)</td>
<td>Workflow-as-code, monorepos</td>
<td>Full YAML config in workflow file</td>
</tr>
<tr>
<td><strong>3. Config File</strong><br/>(<code>release.config.yaml</code>)</td>
<td>Shared config, power users</td>
<td>Traditional config file in repo</td>
</tr>
</table>

### What's Supported

**AI Providers (5 total):**
- ✅ **OpenAI** (GPT-4, GPT-4o, GPT-4o-mini) - `OPENAI_API_KEY`
- ✅ **Anthropic** (Claude Sonnet, Opus) - `ANTHROPIC_API_KEY`
- ✅ **Google Gemini** (2.0 Flash, 1.5 Pro) - `GEMINI_API_KEY`
- ✅ **Azure OpenAI** (Enterprise) - `AZURE_OPENAI_KEY` + `AZURE_OPENAI_ENDPOINT`
- ✅ **Ollama** (Local, free) - `OLLAMA_HOST`

**Plugins (13 total):**
- ✅ **Version Control:** GitHub, GitLab
- ✅ **Notifications:** Slack, Discord, Microsoft Teams
- ✅ **Project Management:** Jira, LaunchNotes
- ✅ **Package Managers:** npm, PyPI, Cargo, RubyGems
- ✅ **Distribution:** Homebrew, Docker

**Versioning Strategies:**
- ✅ Conventional Commits (semver auto-bump)
- ✅ Manual versioning
- ✅ Calendar versioning (CalVer)

**Changelog Formats:**
- ✅ Markdown
- ✅ JSON
- ✅ YAML

**Commands:**
- ✅ `full` - Complete workflow (plan → bump → notes → approve → publish)
- ✅ `plan` - Analyze changes
- ✅ `bump` - Calculate version
- ✅ `notes` - Generate release notes
- ✅ `approve` - Review & approve
- ✅ `publish` - Create release

### Example Configuration

For advanced customization, use `config-content` or create a `release.config.yaml` file. See the [ReleasePilot documentation](https://github.com/felixgeelhaar/release-pilot) for full options.

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
