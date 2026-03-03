export type SsgNavItem = {
    label: string;
    href: string;
};
export type SsgConfig = {
    siteName?: string;
    baseUrl?: string;
    cleanUrls?: 'always' | 'never';
    defaultLayout?: string;
    publicDir?: string;
    nav?: SsgNavItem[];
};
export declare const DEFAULT_CONFIG: Required<Pick<SsgConfig, 'cleanUrls' | 'defaultLayout'>>;
export declare function loadSsgConfig(cwd: string, configPath?: string): Promise<{
    path: string | null;
    config: SsgConfig;
}>;
export declare function mergeConfig(base: SsgConfig, overrides: SsgConfig): SsgConfig;
//# sourceMappingURL=config.d.ts.map