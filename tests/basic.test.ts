import { describe, it, expect } from 'vitest'
import { createMcpPlugin } from '../src/plugin.ts'

describe('MCP Plugin', () => {
	it('should create a plugin instance', () => {
			const mcpPlugin = createMcpPlugin()
			expect(mcpPlugin).toBeDefined()
			expect(mcpPlugin.name).toBe('MCP Plugin')
	})

	it('should have a plugin id', () => {
			const mcpPlugin = createMcpPlugin()
			expect(mcpPlugin.id).toBe('mcp')
	})
})
