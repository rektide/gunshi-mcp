export interface McpPluginOptions {
	/**
	 * Port for MCP HTTP server (optional, defaults to stdio)
	 */
	port?: number

	/**
	 * Custom prompts directory path (defaults to {projectRoot}/prompts)
	 */
	promptsDir?: string

	/**
	 * Enable debug logging
	 */
	debug?: boolean
}

export interface CommandMetadata {
	name: string
	description: string
	args: Record<string, unknown>
}

export interface PromptMetadata {
	name: string
	description: string
	path: string
}

export interface McpServerConfig {
	name: string
	version: string
}
