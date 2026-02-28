declare module '@babel/core' {
	// Minimal types for our current scaffold usage.
	export type PluginObj = any
	export const types: any
	export function transformSync(code: string, opts: any): { code?: string } | null
}

declare module '@babel/plugin-syntax-jsx' {
	const plugin: any
	export default plugin
}

declare module '@babel/helper-plugin-utils' {
	export function declare(fn: any): any
}
