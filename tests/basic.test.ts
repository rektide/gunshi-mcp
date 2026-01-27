import { describe, it, expect } from "vitest"
import { createMcpPlugin } from "../src/mcp-plugin.js"
import { defineTool } from "../src/define-tool.js"
import { z } from "zod"

describe("MCP Plugin", () => {
	it("should create a plugin instance", () => {
		const mcpPlugin = createMcpPlugin()
		expect(mcpPlugin).toBeDefined()
		expect(mcpPlugin.name).toBe("MCP Plugin")
	})

	it("should have a plugin id", () => {
		const mcpPlugin = createMcpPlugin()
		expect(mcpPlugin.id).toBe("gunshi-mcp:mcp")
	})

	describe("Tool Registration", () => {
		it("should register tools in setup", () => {
			const testTool = defineTool()({
				name: "test-tool",
				description: "A test tool",
				inputSchema: {
					message: z.string().describe("A message"),
					count: z.number().default(1),
				} as Record<string, unknown>,
				handler: async (_args) => ({
					type: "tool_result",
					toolUseId: "test-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			})

			const mcpPlugin = createMcpPlugin({ tools: [testTool] })
			expect(mcpPlugin).toBeDefined()
		})

		it("should handle tools with optional fields", () => {
			const testTool = defineTool()({
				name: "optional-tool",
				description: "Tool with optional fields",
				inputSchema: {
					required: z.string(),
					optional: z.string().optional(),
				} as Record<string, unknown>,
				handler: async (_args) => ({
					type: "tool_result",
					toolUseId: "optional-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			})

			const mcpPlugin = createMcpPlugin({ tools: [testTool] })
			expect(mcpPlugin).toBeDefined()
		})

		it("should handle tools with enum fields", () => {
			const testTool = defineTool()({
				name: "enum-tool",
				description: "Tool with enum",
				inputSchema: {
					format: z.enum(["json", "text", "yaml"]).default("text"),
				} as Record<string, unknown>,
				handler: async (_args) => ({
					type: "tool_result",
					toolUseId: "enum-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			})

			const mcpPlugin = createMcpPlugin({ tools: [testTool] })
			expect(mcpPlugin).toBeDefined()
		})

		it("should handle tools with CLI overrides", () => {
			const testTool = defineTool()({
				name: "cli-tool",
				description: "Tool with CLI config",
				inputSchema: {
					value: z.string(),
				} as Record<string, unknown>,
				cli: {
					args: {
						value: {
							type: "string",
							description: "A custom description",
							short: "v",
						},
					},
				},
				handler: async (_args) => ({
					type: "tool_result",
					toolUseId: "cli-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			})

			const mcpPlugin = createMcpPlugin({ tools: [testTool] })
			expect(mcpPlugin).toBeDefined()
		})

		it("should handle multiple tools", () => {
			const tool1 = defineTool()({
				name: "tool1",
				description: "First tool",
				inputSchema: { input: z.string() } as Record<string, unknown>,
				handler: async (_args) => ({
					type: "tool_result",
					toolUseId: "tool1",
					content: [{ type: "text", text: "Done" }],
				}),
			})

			const tool2 = defineTool()({
				name: "tool2",
				description: "Second tool",
				inputSchema: { input: z.number() } as Record<string, unknown>,
				handler: async (_args) => ({
					type: "tool_result",
					toolUseId: "tool2",
					content: [{ type: "text", text: "Done" }],
				}),
			})

			const mcpPlugin = createMcpPlugin({ tools: [tool1, tool2] })
			expect(mcpPlugin).toBeDefined()
		})

		it("should handle tools with array field using custom parser", () => {
			const testTool = defineTool()({
				name: "array-tool",
				description: "Tool with array field",
				inputSchema: {
					items: z.array(z.string()).default([]),
				} as Record<string, unknown>,
				cli: {
					args: {
						items: {
							type: "custom",
							parse: (v) => v.split(",").map((s) => s.trim()),
						},
					},
				},
				handler: async (_args) => ({
					type: "tool_result",
					toolUseId: "array-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			})

			const mcpPlugin = createMcpPlugin({ tools: [testTool] })
			expect(mcpPlugin).toBeDefined()
		})

		it("should handle empty input schema", () => {
			const testTool = defineTool()({
				name: "no-input-tool",
				description: "Tool with no input",
				inputSchema: {},
				handler: async () => ({
					type: "tool_result",
					toolUseId: "no-input-tool",
					content: [{ type: "text", text: "No input needed" }],
				}),
			})

			const mcpPlugin = createMcpPlugin({ tools: [testTool] })
			expect(mcpPlugin).toBeDefined()
		})

		it("should handle boolean fields", () => {
			const testTool = defineTool()({
				name: "bool-tool",
				description: "Tool with boolean",
				inputSchema: {
					flag: z.boolean().default(false),
					enabled: z.boolean(),
				} as Record<string, unknown>,
				handler: async (_args) => ({
					type: "tool_result",
					toolUseId: "bool-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			})

			const mcpPlugin = createMcpPlugin({ tools: [testTool] })
			expect(mcpPlugin).toBeDefined()
		})
})
