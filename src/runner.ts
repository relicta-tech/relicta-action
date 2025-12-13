import * as core from '@actions/core'
import * as exec from '@actions/exec'
import {ActionInputs, ActionOutputs} from './types'

export async function runReleasePilot(
  binaryPath: string,
  inputs: ActionInputs
): Promise<ActionOutputs> {
  const outputs: ActionOutputs = {}

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

  if (inputs.config) {
    commonArgs.push('--config', inputs.config)
  }

  if (inputs.dryRun) {
    commonArgs.push('--dry-run')
  }

  // Execute command(s)
  switch (inputs.command.toLowerCase()) {
    case 'full':
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

    case 'plan':
    case 'bump':
    case 'notes':
    case 'publish':
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

    case 'approve':
      const approveArgs = [...commonArgs]
      if (inputs.autoApprove) {
        approveArgs.unshift('--yes')
      }
      await executeCommand(binaryPath, ['approve', ...approveArgs], env, inputs.workingDirectory)
      break

    default:
      // Custom command - pass through as-is
      const customArgs = inputs.command.split(' ')
      await executeCommand(binaryPath, [...customArgs, ...commonArgs], env, inputs.workingDirectory)
      break
  }

  return outputs
}

async function executeCommand(
  binaryPath: string,
  args: string[],
  env: {[key: string]: string},
  cwd: string
): Promise<string> {
  let output = ''
  let errorOutput = ''

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
        errorOutput += str
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
