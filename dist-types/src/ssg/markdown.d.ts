import { type VNode } from '../h';
import type { MarkdownToPageResult } from './types';
export type MarkdownToVNodeOptions = {
    /** Wrap output in a container element, default: 'div' */
    wrapperTag?: string;
};
export type MarkdownToPageOptions = MarkdownToVNodeOptions & {
    /** If true, parse YAML frontmatter when present. */
    frontmatter?: boolean;
};
export declare function markdownToVNode(markdown: string, options?: MarkdownToVNodeOptions): Promise<VNode>;
export declare function markdownToPage(markdown: string, options?: MarkdownToPageOptions): Promise<MarkdownToPageResult>;
//# sourceMappingURL=markdown.d.ts.map