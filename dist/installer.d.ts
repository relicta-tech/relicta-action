export declare function installRelicta(version: string): Promise<string>
/**
 * Install specified plugins for the current platform.
 * Plugins are downloaded from the same release as the main binary.
 */
export declare function installPlugins(
  version: string,
  plugins: string[],
  relictaBinaryPath: string
): Promise<void>
