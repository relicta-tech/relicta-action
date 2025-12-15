export interface ActionInputs {
  version: string
  command: string
  githubToken: string
  config?: string
  configContent?: string
  autoApprove: boolean
  dryRun: boolean
  workingDirectory: string
  plugins: string[]
}

export interface ActionOutputs {
  version?: string
  releaseUrl?: string
  tagName?: string
  releaseId?: string
}

export interface Platform {
  os: string
  arch: string
}

export interface DownloadInfo {
  url: string
  filename: string
  checksumUrl: string
}
