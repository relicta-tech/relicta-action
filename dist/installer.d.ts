export declare function installRelicta(version: string): Promise<string>
/**
 * Install specified plugins using relicta's built-in plugin installer.
 * This delegates to `relicta plugin install` to ensure compatibility.
 */
export declare function installPlugins(
  _version: string,
  plugins: string[],
  relictaBinaryPath: string
): Promise<void>
