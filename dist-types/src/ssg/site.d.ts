export declare function ensureDir(path: string): Promise<void>;
export declare function walkFiles(dir: string): Promise<string[]>;
export declare function copyDir(srcDir: string, dstDir: string): Promise<void>;
export declare function stripExt(path: string): string;
export type CleanUrlsMode = 'always' | 'never';
export declare function toOutputPath(relMdPath: string, cleanUrls: CleanUrlsMode): string;
export declare function toUrlFromOutPath(outRelPath: string): string;
export type SitemapEntry = {
    loc: string;
    lastmod?: string;
};
export declare function renderSitemapXml(baseUrl: string, entries: SitemapEntry[]): string;
//# sourceMappingURL=site.d.ts.map