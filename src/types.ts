export interface McpPluginOptions {
	/**
	 * Port for MCP HTTP server (optional, defaults to stdio)
	 */
	port?: number

	/**
	 * Custom prompts directory path (defaults to {projectRoot}/prompts)
	 */
	promptsDir?: string
}

export interface McpExtension {
	startServer: (options?: { port?: number }) => Promise<void>
	stopServer: () => Promise<void>
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
