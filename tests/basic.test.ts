import { describe, it, expect } from "vitest"
import { createMcpPlugin } from "../src/mcp-plugin.js"
import { defineTool } from "../src/define-tool.js"
import { zodToJsonSchema } from "../src/zod-to-gunshi.js"
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
				input: z.object({
					message: z.string().describe("A message"),
					count: z.number().default(1),
				}),
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
				input: z.object({
					required: z.string(),
					optional: z.string().optional(),
				}),
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
				input: z.object({
					format: z.enum(["json", "text", "yaml"]).default("text"),
				}),
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
				input: z.object({
					value: z.string(),
				}),
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
				input: z.object({ input: z.string() }),
				handler: async (_args) => ({
					type: "tool_result",
					toolUseId: "tool1",
					content: [{ type: "text", text: "Done" }],
				}),
			})

			const tool2 = defineTool()({
				name: "tool2",
				description: "Second tool",
				input: z.object({ input: z.number() }),
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
				input: z.object({
					items: z.array(z.string()).default([]),
				}),
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
				input: z.object({}),
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
				input: z.object({
					flag: z.boolean().default(false),
					enabled: z.boolean(),
				}),
				handler: async (_args) => ({
					type: "tool_result",
					toolUseId: "bool-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			})

			const mcpPlugin = createMcpPlugin({ tools: [testTool] })
			expect(mcpPlugin).toBeDefined()
		})

		it("should infer correct types for handler args", () => {
			const testTool = defineTool()({
				name: "typed-tool",
				description: "Tool with typed handler args",
				input: z.object({
					message: z.string(),
					count: z.number(),
					flag: z.boolean(),
				}),
				handler: async (args) => {
					// TypeScript should infer correct types
					const _messageCheck: string = args.message
					const _countCheck: number = args.count
					const _flagCheck: boolean = args.flag
					return {
						type: "tool_result",
						toolUseId: "typed-tool",
						content: [{ type: "text", text: "Done" }],
					}
				},
			})

			const mcpPlugin = createMcpPlugin({ tools: [testTool] })
			expect(mcpPlugin).toBeDefined()
		})
	})

	describe("JSON Schema Conversion", () => {
		it("should convert simple string schema to JSON Schema", () => {
			const schema = z.object({ message: z.string().describe("A message") })
			const jsonSchema = zodToJsonSchema(schema)

			expect(jsonSchema).toEqual({
				type: "object",
				properties: {
					message: { type: "string", description: "A message" },
				},
				required: ["message"],
				additionalProperties: false,
			})
		})

		it("should convert schema with optional fields", () => {
			const schema = z.object({
				required: z.string(),
				optional: z.string().optional(),
			})
			const jsonSchema = zodToJsonSchema(schema)

			expect(jsonSchema).toEqual({
				type: "object",
				properties: {
					required: { type: "string" },
					optional: { type: "string" },
				},
				required: ["required"],
				additionalProperties: false,
			})
		})

		it("should convert schema with default values", () => {
			const schema = z.object({
				count: z.number().default(5),
				flag: z.boolean().default(false),
			})
			const jsonSchema = zodToJsonSchema(schema)

			expect(jsonSchema).toEqual({
				type: "object",
				properties: {
					count: { type: "number", default: 5 },
					flag: { type: "boolean", default: false },
				},
				additionalProperties: false,
			})
		})

		it("should convert enum schema to JSON Schema", () => {
			const schema = z.object({
				format: z.enum(["json", "text", "yaml"]).describe("Output format"),
			})
			const jsonSchema = zodToJsonSchema(schema)

			expect(jsonSchema).toEqual({
				type: "object",
				properties: {
					format: { type: "string", description: "Output format", enum: ["json", "text", "yaml"] },
				},
				required: ["format"],
				additionalProperties: false,
			})
		})

		it("should convert array schema to JSON Schema", () => {
			const schema = z.object({
				items: z.array(z.string()).default([]),
			})
			const jsonSchema = zodToJsonSchema(schema)

			expect(jsonSchema).toEqual({
				type: "object",
				properties: {
					items: { type: "array", items: { type: "string" }, default: [] },
				},
				additionalProperties: false,
			})
		})

		it("should convert empty schema to JSON Schema", () => {
			const schema = z.object({})
			const jsonSchema = zodToJsonSchema(schema)

			expect(jsonSchema).toEqual({
				type: "object",
				properties: {},
				additionalProperties: false,
			})
		})
	})
})