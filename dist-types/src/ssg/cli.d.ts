import { type CleanUrlsMode } from './site';
export type SsgCliOptions = {
    inputDir: string;
    outputDir: string;
    /** Copy static assets from here into output root. default: `<inputDir>/public` if it exists */
    publicDir?: string;
    /** If provided, generate sitemap.xml using this base URL (e.g. https://example.com). */
    baseUrl?: string;
    /** Control `about.md` -> `about/index.html` behavior. default: 'always' */
    cleanUrls?: CleanUrlsMode;
    /** Default layout wrapper applied to every page unless frontmatter sets `layout: false`. default: 'default' */
    defaultLayout?: string;
    /** Site title used in nav/header/footer by default layouts. */
    siteName?: string;
};
export declare function buildStaticSite({ inputDir, outputDir }: SsgCliOptions): Promise<void>;
//# sourceMappingURL=cli.d.ts.map