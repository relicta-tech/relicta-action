export declare function installRelicta(version: string): Promise<string>;
/**
 * Install specified plugins for the current platform.
 * Each plugin is downloaded from its own repo: relicta-tech/plugin-{name}
 */
export declare function installPlugins(version: string, plugins: string[], relictaBinaryPath: string): Promise<void>;
