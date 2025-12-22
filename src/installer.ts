import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as path from 'path'
import * as fs from 'fs'
import {Platform, DownloadInfo} from './types'

const REPO_OWNER = 'relicta-tech'
const REPO_NAME = 'relicta'

export async function installRelicta(version: string): Promise<string> {
  core.info(`Installing relicta ${version}...`)

  // Check cache first
  const cachedPath = tc.find('relicta', version)
  if (cachedPath) {
    core.info(`Found cached relicta at ${cachedPath}`)
    const platform = detectPlatform()
    const binaryName = platform.os === 'Windows' ? 'relicta.exe' : 'relicta'
    const cachedBinary = findBinary(cachedPath, binaryName)
    if (cachedBinary) {
      return cachedBinary
    }
    core.warning('Cached binary not found, re-downloading...')
  }

  // Detect platform
  const platform = detectPlatform()
  core.info(`Detected platform: ${platform.os}/${platform.arch}`)

  // Get download URL
  const downloadInfo = getDownloadInfo(version, platform)
  core.info(`Downloading from: ${downloadInfo.url}`)

  // Download archive
  const archivePath = await tc.downloadTool(downloadInfo.url)
  core.info(`Downloaded to: ${archivePath}`)

  // Download and verify checksum
  await verifyChecksum(archivePath, downloadInfo.checksumUrl, downloadInfo.filename)

  // Extract archive
  let extractedPath: string
  if (downloadInfo.filename.endsWith('.tar.gz')) {
    extractedPath = await tc.extractTar(archivePath)
  } else if (downloadInfo.filename.endsWith('.zip')) {
    extractedPath = await tc.extractZip(archivePath)
  } else {
    throw new Error(`Unsupported archive format: ${downloadInfo.filename}`)
  }

  core.info(`Extracted to: ${extractedPath}`)

  // Find binary in extracted directory
  const binaryName = platform.os === 'Windows' ? 'relicta.exe' : 'relicta'
  const binaryPath = findBinary(extractedPath, binaryName)

  if (!binaryPath) {
    throw new Error(`Binary not found in ${extractedPath}`)
  }

  core.info(`Found binary at: ${binaryPath}`)

  // Make binary executable (Unix)
  if (platform.os !== 'Windows') {
    await exec.exec('chmod', ['+x', binaryPath])
  }

  // Cache for future runs
  const cachedDir = await tc.cacheDir(extractedPath, 'relicta', version)
  core.info(`Cached relicta to: ${cachedDir}`)

  return binaryPath
}

/**
 * Install specified plugins for the current platform.
 * Each plugin is downloaded from its own repo: relicta-tech/plugin-{name}
 */
export async function installPlugins(
  version: string,
  plugins: string[],
  relictaBinaryPath: string
): Promise<void> {
  if (plugins.length === 0) {
    return
  }

  core.info(`Installing plugins: ${plugins.join(', ')}`)

  const platform = detectPlatform()
  const pluginsDir = path.join(path.dirname(relictaBinaryPath), 'plugins')

  // Create plugins directory
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, {recursive: true})
  }

  // Download each plugin from its own repo
  for (const pluginName of plugins) {
    try {
      await downloadPlugin(version, pluginName, platform, pluginsDir)
    } catch (error) {
      core.warning(`Failed to install plugin ${pluginName}: ${error}`)
    }
  }

  core.info(`✓ Plugins installed to: ${pluginsDir}`)
}

async function downloadPlugin(
  version: string,
  pluginName: string,
  platform: Platform,
  pluginsDir: string
): Promise<void> {
  // Plugin archive naming: github_darwin_aarch64.tar.gz, slack_linux_x86_64.tar.gz, etc.
  const osName = platform.os.toLowerCase()
  const archiveExt = platform.os === 'Windows' ? '.zip' : '.tar.gz'
  const binaryExt = platform.os === 'Windows' ? '.exe' : ''
  const archiveFilename = `${pluginName}_${osName}_${platform.arch}${archiveExt}`

  const url = getPluginUrl(pluginName, version, archiveFilename)
  core.info(`  Downloading ${pluginName} from: ${url}`)

  const downloadPath = await tc.downloadTool(url)

  // Verify checksum from plugin's own checksums.txt
  await verifyPluginChecksum(pluginName, version, downloadPath, archiveFilename)

  // Extract archive
  let extractedPath: string
  if (archiveFilename.endsWith('.tar.gz')) {
    extractedPath = await tc.extractTar(downloadPath)
  } else {
    extractedPath = await tc.extractZip(downloadPath)
  }

  // Find the plugin binary in extracted directory
  // Binary is just the plugin name (e.g., github or github.exe on Windows)
  const binaryPath = findPluginBinary(extractedPath, pluginName, binaryExt)

  if (!binaryPath) {
    throw new Error(`Binary not found in extracted archive for ${pluginName}`)
  }

  // Move to plugins directory with relicta- prefix (required by plugin loader)
  const targetPath = path.join(pluginsDir, `relicta-${pluginName}${binaryExt}`)
  fs.copyFileSync(binaryPath, targetPath)

  // Make executable on Unix
  if (platform.os !== 'Windows') {
    await exec.exec('chmod', ['+x', targetPath])
  }

  core.info(`  ✓ Installed ${pluginName}`)
}

function getPluginUrl(pluginName: string, version: string, filename: string): string {
  const pluginRepo = `plugin-${pluginName}`
  if (version === 'latest') {
    return `https://github.com/${REPO_OWNER}/${pluginRepo}/releases/latest/download/${filename}`
  }
  return `https://github.com/${REPO_OWNER}/${pluginRepo}/releases/download/${version}/${filename}`
}

function getPluginChecksumUrl(pluginName: string, version: string): string {
  const pluginRepo = `plugin-${pluginName}`
  if (version === 'latest') {
    return `https://github.com/${REPO_OWNER}/${pluginRepo}/releases/latest/download/checksums.txt`
  }
  return `https://github.com/${REPO_OWNER}/${pluginRepo}/releases/download/${version}/checksums.txt`
}

async function verifyPluginChecksum(
  pluginName: string,
  version: string,
  archivePath: string,
  filename: string
): Promise<void> {
  try {
    const checksumUrl = getPluginChecksumUrl(pluginName, version)
    const checksumsPath = await tc.downloadTool(checksumUrl)
    const checksumsContent = fs.readFileSync(checksumsPath, 'utf-8')

    let expectedChecksum: string | undefined
    for (const line of checksumsContent.split('\n')) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 2 && parts[1] === filename) {
        expectedChecksum = parts[0]
        break
      }
    }

    if (!expectedChecksum) {
      core.warning(`  Checksum not found for ${filename}, skipping verification`)
      return
    }

    const crypto = await import('crypto')
    const fileBuffer = fs.readFileSync(archivePath)
    const actualChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex')

    if (actualChecksum !== expectedChecksum) {
      throw new Error(`Checksum mismatch for ${filename}`)
    }

    core.info(`  ✓ Checksum verified for ${pluginName}`)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Checksum mismatch')) {
      throw error
    }
    core.warning(`  Failed to verify checksum for ${pluginName}: ${error}`)
  }
}

function detectPlatform(): Platform {
  const platformOs = process.platform
  const platformArch = process.arch

  let os: string
  let arch: string

  // Normalize OS names
  if (platformOs === 'darwin') {
    os = 'Darwin'
  } else if (platformOs === 'linux') {
    os = 'Linux'
  } else if (platformOs === 'win32') {
    os = 'Windows'
  } else {
    throw new Error(`Unsupported OS: ${platformOs}`)
  }

  // Normalize arch names
  if (platformArch === 'x64') {
    arch = 'x86_64'
  } else if (platformArch === 'arm64') {
    arch = 'aarch64'
  } else {
    throw new Error(`Unsupported architecture: ${platformArch}`)
  }

  return {os, arch}
}

function getDownloadInfo(version: string, platform: Platform): DownloadInfo {
  const ext = platform.os === 'Windows' ? 'zip' : 'tar.gz'
  const filename = `relicta_${platform.os}_${platform.arch}.${ext}`

  let url: string
  if (version === 'latest') {
    url = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest/download/${filename}`
  } else {
    url = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${version}/${filename}`
  }

  let checksumUrl: string
  if (version === 'latest') {
    checksumUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest/download/checksums.txt`
  } else {
    checksumUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${version}/checksums.txt`
  }

  return {url, filename, checksumUrl}
}

async function verifyChecksum(
  archivePath: string,
  checksumUrl: string,
  filename: string
): Promise<void> {
  try {
    core.info('Verifying checksum...')

    // Download checksums file
    const checksumsPath = await tc.downloadTool(checksumUrl)
    const checksumsContent = fs.readFileSync(checksumsPath, 'utf-8')

    // Parse checksums file
    const lines = checksumsContent.split('\n')
    let expectedChecksum: string | undefined

    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 2 && parts[1] === filename) {
        expectedChecksum = parts[0]
        break
      }
    }

    if (!expectedChecksum) {
      core.warning(`Checksum not found for ${filename}, skipping verification`)
      return
    }

    // Calculate actual checksum
    const crypto = await import('crypto')
    const fileBuffer = fs.readFileSync(archivePath)
    const actualChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex')

    if (actualChecksum !== expectedChecksum) {
      throw new Error(
        `Checksum mismatch!\nExpected: ${expectedChecksum}\nActual: ${actualChecksum}`
      )
    }

    core.info('✓ Checksum verified')
  } catch (error) {
    core.warning(`Failed to verify checksum: ${error}`)
    // Don't fail on checksum errors, just warn
  }
}

function findBinary(extractedPath: string, binaryName: string): string | null {
  // Check root directory first
  const rootPath = path.join(extractedPath, binaryName)
  if (fs.existsSync(rootPath)) {
    return rootPath
  }

  // Search in subdirectories (archive may contain a folder like relicta_Linux_x86_64/)
  const entries = fs.readdirSync(extractedPath, {withFileTypes: true})
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('relicta')) {
      const subPath = path.join(extractedPath, entry.name, binaryName)
      if (fs.existsSync(subPath)) {
        return subPath
      }
    }
  }

  return null
}

function findPluginBinary(
  extractedPath: string,
  pluginName: string,
  binaryExt: string
): string | null {
  // Plugin binary is just the plugin name (e.g., github or github.exe on Windows)
  const binaryName = `${pluginName}${binaryExt}`

  // Check root directory first
  const rootPath = path.join(extractedPath, binaryName)
  if (fs.existsSync(rootPath)) {
    return rootPath
  }

  // Search in extracted files
  const entries = fs.readdirSync(extractedPath, {withFileTypes: true})
  for (const entry of entries) {
    if (entry.isFile()) {
      const name = entry.name.toLowerCase()
      // Match plugin name with or without extension
      if (name === pluginName.toLowerCase() || name === binaryName.toLowerCase()) {
        return path.join(extractedPath, entry.name)
      }
    }
    // Check subdirectories (e.g., if archive contains a folder)
    if (entry.isDirectory()) {
      const subPath = path.join(extractedPath, entry.name, binaryName)
      if (fs.existsSync(subPath)) {
        return subPath
      }
    }
  }

  return null
}
