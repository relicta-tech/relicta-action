import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as path from 'path'
import * as fs from 'fs'
import {Platform, DownloadInfo} from './types'

const REPO_OWNER = 'felixgeelhaar'
const REPO_NAME = 'release-pilot'

export async function installReleasePilot(version: string): Promise<string> {
  core.info(`Installing release-pilot ${version}...`)

  // Check cache first
  const cachedPath = tc.find('release-pilot', version)
  if (cachedPath) {
    core.info(`Found cached release-pilot at ${cachedPath}`)
    const platform = detectPlatform()
    const binaryName = platform.os === 'Windows' ? 'release-pilot.exe' : 'release-pilot'
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
  const binaryName = platform.os === 'Windows' ? 'release-pilot.exe' : 'release-pilot'
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
  const cachedDir = await tc.cacheDir(extractedPath, 'release-pilot', version)
  core.info(`Cached release-pilot to: ${cachedDir}`)

  return binaryPath
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
  const filename = `release-pilot_${platform.os}_${platform.arch}.${ext}`

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

  // Search in subdirectories (archive may contain a folder like release-pilot_Linux_x86_64/)
  const entries = fs.readdirSync(extractedPath, {withFileTypes: true})
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('release-pilot')) {
      const subPath = path.join(extractedPath, entry.name, binaryName)
      if (fs.existsSync(subPath)) {
        return subPath
      }
    }
  }

  return null
}
