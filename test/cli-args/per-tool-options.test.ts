import { describe, it, expect } from "vitest"
import { z } from "zod"
import { defineTool } from "../../src/define-tool.js"
import { createMcpPlugin } from "../../src/mcp-plugin.js"

describe("MCP Plugin - Per-Tool CLI Options", () => {
	it("should handle different tools with different separators", () => {
		const tool1 = defineTool()({
			name: "tool1",
			description: "Tool with dash separator",
			inputSchema: z.object({
				config: z.object({
					timeout: z.number(),
				}),
			}),
			cliOptions: { separator: "-" },
			handler: async () => ({
				type: "tool_result",
				toolUseId: "tool1",
				content: [{ type: "text", text: "Done" }],
			}),
		})

		const tool2 = defineTool()({
			name: "tool2",
			description: "Tool with dot separator",
			inputSchema: z.object({
				config: z.object({
					timeout: z.number(),
				}),
			}),
			cliOptions: { separator: "." },
			handler: async () => ({
				type: "tool_result",
				toolUseId: "tool2",
				content: [{ type: "text", text: "Done" }],
			}),
		})

		const mcpPlugin = createMcpPlugin({ tools: [tool1, tool2] })

		expect(mcpPlugin).toBeDefined()
	})

	it("should handle different tools with different maxDepth", () => {
		const tool1 = defineTool()({
			name: "shallow-tool",
			description: "Tool with shallow depth",
			inputSchema: z.object({
				config: z.object({
					timeout: z.number(),
				}),
			}),
			cliOptions: { maxDepth: 0 },
			handler: async () => ({
				type: "tool_result",
				toolUseId: "shallow-tool",
				content: [{ type: "text", text: "Done" }],
			}),
		})

		const tool2 = defineTool()({
			name: "deep-tool",
			description: "Tool with deep depth",
			inputSchema: z.object({
				config: z.object({
					timeout: z.number(),
				}),
			}),
			cliOptions: { maxDepth: 5 },
			handler: async () => ({
				type: "tool_result",
				toolUseId: "deep-tool",
				content: [{ type: "text", text: "Done" }],
			}),
		})

		const mcpPlugin = createMcpPlugin({ tools: [tool1, tool2] })

		expect(mcpPlugin).toBeDefined()
	})

	it("should handle different tools with different arrayHandling", () => {
		const tool1 = defineTool()({
			name: "repeated-tool",
			description: "Tool with repeated array handling",
			inputSchema: z.object({
				items: z.array(z.string()),
			}),
			cliOptions: { arrayHandling: "repeated" },
			handler: async () => ({
				type: "tool_result",
				toolUseId: "repeated-tool",
				content: [{ type: "text", text: "Done" }],
			}),
		})

		const tool2 = defineTool()({
			name: "json-tool",
			description: "Tool with JSON array handling",
			inputSchema: z.object({
				items: z.array(z.string()),
			}),
			cliOptions: { arrayHandling: "json" },
			handler: async () => ({
				type: "tool_result",
				toolUseId: "json-tool",
				content: [{ type: "text", text: "Done" }],
			}),
		})

		const mcpPlugin = createMcpPlugin({ tools: [tool1, tool2] })

		expect(mcpPlugin).toBeDefined()
	})

	it("should handle tool with all CLI options combined", () => {
		const tool = defineTool()({
			name: "combined-tool",
			description: "Tool with all CLI options",
			inputSchema: z.object({
				config: z.object({
					items: z.array(z.string()),
				}),
			}),
			cliOptions: {
				separator: "_",
				maxDepth: 3,
				arrayHandling: "repeated",
			},
			handler: async () => ({
				type: "tool_result",
				toolUseId: "combined-tool",
				content: [{ type: "text", text: "Done" }],
			}),
		})

		const mcpPlugin = createMcpPlugin({ tools: [tool] })

		expect(mcpPlugin).toBeDefined()
	})

	it("should handle tool with no CLI options (use defaults)", () => {
		const tool = defineTool()({
			name: "default-tool",
			description: "Tool with default CLI options",
			inputSchema: z.object({
				value: z.string(),
			}),
			handler: async () => ({
				type: "tool_result",
				toolUseId: "default-tool",
				content: [{ type: "text", text: "Done" }],
			}),
		})

		const mcpPlugin = createMcpPlugin({ tools: [tool] })

		expect(mcpPlugin).toBeDefined()
	})
})
