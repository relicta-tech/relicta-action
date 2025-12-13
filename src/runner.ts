import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {ActionInputs, ActionOutputs} from './types'

export async function runReleasePilot(
  binaryPath: string,
  inputs: ActionInputs
): Promise<ActionOutputs> {
  const outputs: ActionOutputs = {}
  let tempConfigPath: string | null = null

  try {
    // Set environment variables
    const env: {[key: string]: string} = {
      ...process.env,
      GITHUB_TOKEN: inputs.githubToken
    }

    if (inputs.dryRun) {
      env.RELEASE_PILOT_DRY_RUN = 'true'
    }

    // Common args
    const commonArgs: string[] = []

    // Handle config: inline content takes precedence over file path
    if (inputs.configContent) {
      // Write inline YAML to a temporary file
      tempConfigPath = path.join(os.tmpdir(), `release-config-${Date.now()}.yaml`)
      fs.writeFileSync(tempConfigPath, inputs.configContent, 'utf8')
      commonArgs.push('--config', tempConfigPath)
      core.info(`Using inline configuration (written to ${tempConfigPath})`)
    } else if (inputs.config) {
      commonArgs.push('--config', inputs.config)
      core.info(`Using configuration file: ${inputs.config}`)
    } else {
      core.info('No configuration file specified - using defaults with auto-detection')
    }

    if (inputs.dryRun) {
      commonArgs.push('--dry-run')
    }

    // Execute command(s)
    switch (inputs.command.toLowerCase()) {
      case 'full': {
        // Run complete workflow
        await executeCommand(binaryPath, ['plan', ...commonArgs], env, inputs.workingDirectory)
        await executeCommand(binaryPath, ['bump', ...commonArgs], env, inputs.workingDirectory)
        await executeCommand(binaryPath, ['notes', ...commonArgs], env, inputs.workingDirectory)

        if (inputs.autoApprove) {
          await executeCommand(
            binaryPath,
            ['approve', '--yes', ...commonArgs],
            env,
            inputs.workingDirectory
          )
        } else {
          await executeCommand(binaryPath, ['approve', ...commonArgs], env, inputs.workingDirectory)
        }

        const publishOutput = await executeCommand(
          binaryPath,
          ['publish', ...commonArgs],
          env,
          inputs.workingDirectory
        )

        // Parse outputs from publish command
        parsePublishOutput(publishOutput, outputs)
        break
      }

      case 'plan':
      case 'bump':
      case 'notes':
      case 'publish': {
        const cmdOutput = await executeCommand(
          binaryPath,
          [inputs.command, ...commonArgs],
          env,
          inputs.workingDirectory
        )

        if (inputs.command === 'publish') {
          parsePublishOutput(cmdOutput, outputs)
        }
        break
      }

      case 'approve': {
        const approveArgs = [...commonArgs]
        if (inputs.autoApprove) {
          approveArgs.unshift('--yes')
        }
        await executeCommand(binaryPath, ['approve', ...approveArgs], env, inputs.workingDirectory)
        break
      }

      default: {
        // Custom command - pass through as-is
        const customArgs = inputs.command.split(' ')
        await executeCommand(
          binaryPath,
          [...customArgs, ...commonArgs],
          env,
          inputs.workingDirectory
        )
        break
      }
    }

    return outputs
  } finally {
    // Clean up temporary config file if created
    if (tempConfigPath && fs.existsSync(tempConfigPath)) {
      try {
        fs.unlinkSync(tempConfigPath)
        core.debug(`Cleaned up temporary config file: ${tempConfigPath}`)
      } catch (error) {
        core.warning(`Failed to clean up temporary config file: ${error}`)
      }
    }
  }
}

async function executeCommand(
  binaryPath: string,
  args: string[],
  env: {[key: string]: string},
  cwd: string
): Promise<string> {
  let output = ''

  const options: exec.ExecOptions = {
    env,
    cwd,
    listeners: {
      stdout: (data: Buffer) => {
        const str = data.toString()
        output += str
        core.info(str)
      },
      stderr: (data: Buffer) => {
        const str = data.toString()
        core.warning(str)
      }
    }
  }

  core.startGroup(`Running: release-pilot ${args.join(' ')}`)

  try {
    const exitCode = await exec.exec(binaryPath, args, options)

    if (exitCode !== 0) {
      throw new Error(`Command failed with exit code ${exitCode}`)
    }

    core.endGroup()
    return output
  } catch (error) {
    core.endGroup()
    throw error
  }
}

function parsePublishOutput(output: string, outputs: ActionOutputs): void {
  // Parse output for version, release URL, tag name, etc.
  // ReleasePilot outputs structured information that we can parse

  // Look for patterns like:
  // - "Created release v1.3.0"
  // - "Release URL: https://github.com/..."
  // - "Tag: v1.3.0"

  const versionMatch = output.match(/(?:version|tag):\s*v?(\d+\.\d+\.\d+)/i)
  if (versionMatch) {
    outputs.version = versionMatch[1]
    outputs.tagName = `v${versionMatch[1]}`
  }

  const urlMatch = output.match(/(?:release url|url):\s*(https:\/\/github\.com\/[^\s]+)/i)
  if (urlMatch) {
    outputs.releaseUrl = urlMatch[1]
  }

  const idMatch = output.match(/(?:release id|id):\s*(\d+)/i)
  if (idMatch) {
    outputs.releaseId = idMatch[1]
  }
}
