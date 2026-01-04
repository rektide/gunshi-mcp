import { plugin } from 'gunshi/plugin'

export interface McpExtension {
	startServer: (options?: { port?: number }) => Promise<void>
	stopServer: () => Promise<void>
}

export default function createMcpPlugin() {
	return plugin({
		id: 'mcp',
		name: 'MCP Plugin',

		setup: ctx => {
			console.log('MCP plugin initialized')
		},

		extension: () => {
			return {
				startServer: async () => {
					console.log('Starting MCP server...')
				},
				stopServer: async () => {
					console.log('Stopping MCP server...')
				}
			}
		}
	})
}
