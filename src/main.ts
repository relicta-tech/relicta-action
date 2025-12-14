import * as core from '@actions/core'
import {ActionInputs} from './types'
import {installRelicta} from './installer'
import {runRelicta} from './runner'

async function run(): Promise<void> {
  try {
    // Get inputs
    const inputs: ActionInputs = {
      version: core.getInput('version') || 'latest',
      command: core.getInput('command') || 'full',
      githubToken: core.getInput('github-token') || process.env.GITHUB_TOKEN || '',
      config: core.getInput('config') || undefined,
      configContent: core.getInput('config-content') || undefined,
      autoApprove: core.getBooleanInput('auto-approve'),
      dryRun: core.getBooleanInput('dry-run'),
      workingDirectory: core.getInput('working-directory') || '.'
    }

    // Validate inputs
    if (!inputs.githubToken) {
      throw new Error(
        'GitHub token is required. Set github-token input or GITHUB_TOKEN environment variable'
      )
    }

    core.info('Starting Relicta action...')
    core.info(`Version: ${inputs.version}`)
    core.info(`Command: ${inputs.command}`)
    core.info(`Dry run: ${inputs.dryRun}`)

    // Install relicta binary
    const binaryPath = await installRelicta(inputs.version)
    core.info(`✓ relicta installed at: ${binaryPath}`)

    // Add binary to PATH
    core.addPath(binaryPath.replace(/\/[^/]+$/, ''))

    // Run relicta
    const outputs = await runRelicta(binaryPath, inputs)

    // Set outputs
    if (outputs.version) {
      core.setOutput('version', outputs.version)
      core.info(`Version: ${outputs.version}`)
    }

    if (outputs.releaseUrl) {
      core.setOutput('release-url', outputs.releaseUrl)
      core.info(`Release URL: ${outputs.releaseUrl}`)
    }

    if (outputs.tagName) {
      core.setOutput('tag-name', outputs.tagName)
      core.info(`Tag: ${outputs.tagName}`)
    }

    if (outputs.releaseId) {
      core.setOutput('release-id', outputs.releaseId)
      core.info(`Release ID: ${outputs.releaseId}`)
    }

    core.info('✓ Relicta action completed successfully')
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}

run()
