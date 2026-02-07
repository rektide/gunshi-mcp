import { describe, it, expect } from "vitest"
import { createMcpPlugin } from "../src/mcp-plugin.ts"
import { defineTool } from "../src/define-tool.ts"
import {
	zodToJsonSchema,
	reconstructNestedValues,
	zodSchemaToGunshiArgs,
} from "../src/zod-to-gunshi.ts"
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
				inputSchema: z.object({
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
				inputSchema: z.object({
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
				inputSchema: z.object({
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
				inputSchema: z.object({
					value: z.string(),
				}),
				cli: {
					value: {
						type: "string",
						description: "A custom description",
						short: "v",
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
				inputSchema: z.object({ inputSchema: z.string() }),
				handler: async (_args) => ({
					type: "tool_result",
					toolUseId: "tool1",
					content: [{ type: "text", text: "Done" }],
				}),
			})

			const tool2 = defineTool()({
				name: "tool2",
				description: "Second tool",
				inputSchema: z.object({ inputSchema: z.number() }),
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
				inputSchema: z.object({
					items: z.array(z.string()).default([]),
				}),
				cli: {
					items: {
						type: "custom",
						parse: (v) => v.split(",").map((s) => s.trim()),
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
				inputSchema: z.object({}),
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
				inputSchema: z.object({
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
				inputSchema: z.object({
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

		it("should convert array schema with correct element type", () => {
			const schema = z.object({
				strings: z.array(z.string()),
				numbers: z.array(z.number()),
				booleans: z.array(z.boolean()),
			})
			const jsonSchema = zodToJsonSchema(schema)

			expect(jsonSchema).toEqual({
				type: "object",
				properties: {
					strings: { type: "array", items: { type: "string" } },
					numbers: { type: "array", items: { type: "number" } },
					booleans: { type: "array", items: { type: "boolean" } },
				},
				required: ["strings", "numbers", "booleans"],
				additionalProperties: false,
			})
		})
	})

	describe("Nested Schema Integration", () => {
		it("should handle nested CLI → handler flow", async () => {
			let receivedArgs: any

			const testTool = defineTool()({
				name: "nested-tool",
				description: "Tool with nested schema",
				inputSchema: z.object({
					config: z.object({
						timeout: z.number(),
						retries: z.number().default(3),
					}),
					name: z.string(),
				}),
				handler: async (args) => {
					receivedArgs = args
					return {
						type: "tool_result",
						toolUseId: "nested-tool",
						content: [{ type: "text", text: "Done" }],
					}
				},
			})

			const mcpPlugin = createMcpPlugin({
				tools: [testTool],
			})

			expect(mcpPlugin).toBeDefined()

			const flatValues = {
				"config-timeout": 30,
				name: "test",
			}

			const separator = testTool.cliOptions?.separator ?? "-"
			const nestedValues = testTool.inputSchema.parse(
				reconstructNestedValues(flatValues, separator),
			)

			expect(nestedValues).toEqual({
				config: { timeout: 30, retries: 3 },
				name: "test",
			})

			await testTool.handler(nestedValues, {
				extensions: {},
				log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
				meta: {},
			})

			expect(receivedArgs).toEqual({
				config: { timeout: 30, retries: 3 },
				name: "test",
			})
		})

		it("should handle deeply nested CLI → handler flow", async () => {
			const testTool = defineTool()({
				name: "deeply-nested-tool",
				description: "Tool with deeply nested schema",
				inputSchema: z.object({
					level1: z.object({
						level2: z.object({
							value: z.string(),
							count: z.number().default(0),
						}),
					}),
				}),
				handler: async (_args) => ({
					type: "tool_result",
					toolUseId: "deeply-nested-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			})

			const mcpPlugin = createMcpPlugin({
				tools: [testTool],
			})

			expect(mcpPlugin).toBeDefined()

			const flatValues = {
				"level1-level2-value": "test",
			}

			const separator = testTool.cliOptions?.separator ?? "-"
			const nestedValues = testTool.inputSchema.parse(
				reconstructNestedValues(flatValues, separator),
			)

			expect(nestedValues).toEqual({
				level1: {
					level2: {
						value: "test",
						count: 0,
					},
				},
			})
		})
	})

	describe("zodSchemaToGunshiArgs - Basic Types", () => {
		it("should handle basic types", () => {
			const schema = z.object({
				name: z.string(),
				age: z.number(),
				active: z.boolean(),
			})

			const args = zodSchemaToGunshiArgs(schema)

			expect(args.name.type).toBe("string")
			expect(args.age.type).toBe("number")
			expect(args.active.type).toBe("boolean")
		})
	})

	describe("zodSchemaToGunshiArgs - Collision Detection", () => {
		it("should detect collisions", () => {
			const schema = z.object({
				"foo-bar": z.string(),
				foo: z.object({
					bar: z.string(),
				}),
			})

			expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(/collisions/i)
		})

		it("should show consistent dot paths in collision message", () => {
			const schema = z.object({
				"foo-bar": z.string(),
				foo: z.object({
					bar: z.string(),
				}),
			})

			expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(
				/foo-bar: foo-bar, foo\.bar/,
			)
		})
	})

	describe("zodSchemaToGunshiArgs - Flattening", () => {
		it("should handle nested objects with flattening", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
					retries: z.number(),
				}),
				name: z.string(),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

			expect(args["config-timeout"]).toBeDefined()
			expect(args["config-timeout"].type).toBe("number")
			expect(args["config-retries"]).toBeDefined()
			expect(args["config-retries"].type).toBe("number")
			expect(args.name).toBeDefined()
			expect(args.name.type).toBe("string")
		})

		it("should respect depth limit", () => {
			const schema = z.object({
				a: z.object({
					b: z.object({
						c: z.object({
							d: z.string(),
						}),
					}),
				}),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { maxDepth: 2, separator: "-" })

			expect(args["a-b-c"]).toBeDefined()
			expect(args["a-b-c"].type).toBe("custom")
		})
	})

	describe("reconstructNestedValues", () => {
		it("should reconstruct nested values from flat keys", () => {
			const flat = { "config-timeout": 30, "config-retries": 3, name: "test" }
			const nested = reconstructNestedValues(flat, "-")

			expect(nested).toEqual({
				config: { timeout: 30, retries: 3 },
				name: "test",
			})
		})

		it("should handle deeply nested values", () => {
			const flat = { "a-b-c": 42, "a-b-d": "hello", x: true }
			const nested = reconstructNestedValues(flat, "-")

			expect(nested).toEqual({
				a: { b: { c: 42, d: "hello" } },
				x: true,
			})
		})

		it("should handle custom separator", () => {
			const flat = { "config.timeout": 30, "config.retries": 3 }
			const nested = reconstructNestedValues(flat, ".")

			expect(nested).toEqual({
				config: { timeout: 30, retries: 3 },
			})
		})

		it("should handle flat-only values", () => {
			const flat = { name: "test", count: 5 }
			const nested = reconstructNestedValues(flat, "-")

			expect(nested).toEqual({ name: "test", count: 5 })
		})
	})

	describe("zodToJsonSchema - Edge Cases", () => {
		it("should handle arrays of objects in JSON schema", () => {
			const schema = z.object({
				items: z.array(
					z.object({
						name: z.string(),
						value: z.number(),
					}),
				),
			})

			const jsonSchema = zodToJsonSchema(schema)

			expect(jsonSchema).toEqual({
				type: "object",
				properties: {
					items: {
						type: "array",
						items: { type: "object" },
					},
				},
				required: ["items"],
				additionalProperties: false,
			})
		})

		it("should handle enum arrays", () => {
			const schema = z.object({
				formats: z.array(z.enum(["json", "xml", "yaml"])),
			})

			const jsonSchema = zodToJsonSchema(schema)

			expect(jsonSchema).toEqual({
				type: "object",
				properties: {
					formats: {
						type: "array",
						items: { type: "string" },
					},
				},
				required: ["formats"],
				additionalProperties: false,
			})
		})
	})

	describe("zodSchemaToGunshiArgs - Wrappers", () => {
		it("should propagate optional from parent", () => {
			const schema = z.object({
				config: z
					.object({
						timeout: z.number(),
					})
					.optional(),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

			expect(args["config-timeout"]).toBeDefined()
			expect(args["config-timeout"].required).toBeUndefined()
		})

		it("should handle nullable wrapper", () => {
			const schema = z.object({
				config: z
					.object({
						timeout: z.number(),
					})
					.nullable(),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

			expect(args["config-timeout"]).toBeDefined()
			expect(args["config-timeout"].required).toBeUndefined()
		})

		it("should handle default wrapper", () => {
			const schema = z.object({
				config: z
					.object({
						timeout: z.number(),
					})
					.default({ timeout: 30 }),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

			expect(args["config-timeout"]).toBeDefined()
			expect(args["config-timeout"].required).toBeUndefined()
		})

		it("should handle catch wrapper", () => {
			const schema = z.object({
				config: z
					.object({
						timeout: z.number(),
					})
					.catch({ timeout: 30 }),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

			expect(args["config-timeout"]).toBeDefined()
			expect(args["config-timeout"].required).toBeUndefined()
		})

		it("should handle multiple nested wrappers", () => {
			const schema = z.object({
				config: z
					.object({
						timeout: z.number(),
					})
					.optional()
					.default({ timeout: 30 }),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

			expect(args["config-timeout"]).toBeDefined()
			expect(args["config-timeout"].required).toBeUndefined()
		})
	})

	describe("zodSchemaToGunshiArgs - Error Scenarios", () => {
		it("should handle malformed flat values for reconstruction", () => {
			const flat: Record<string, unknown> = {}
			const nested = reconstructNestedValues(flat, "-")
			expect(nested).toEqual({})
		})

		it("should handle parse function errors", () => {
			const schema = z.object({
				custom: z.string(),
			})

			const args = zodSchemaToGunshiArgs(schema, {
				custom: {
					parse: (_value: string) => {
						throw new Error("Parse error")
					},
				},
			})

			expect(() => args.custom?.parse?.("test")).toThrow("Parse error")
		})

		it("should handle parse function returning invalid type", () => {
			const schema = z.object({
				count: z.number(),
			})

			const args = zodSchemaToGunshiArgs(schema, {
				count: {
					parse: (_value: string) => "not a number",
				},
			})

			const result = args.count?.parse?.("123")
			expect(result).toBe("not a number")
		})

		it("should handle reconstruction with overlapping paths", () => {
			const flat = {
				a: { b: 1 },
				"a-b": 2,
			}
			const nested = reconstructNestedValues(flat, "-")

			expect(nested).toEqual({
				a: {
					b: 2,
				},
			})
		})

		it("should handle separator collision with field names", () => {
			const schema = z.object({
				"foo-bar": z.string(),
				foo: z.object({
					bar: z.string(),
				}),
			})

			expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(/collisions/i)
		})

		it("should handle very long nested paths", () => {
			const flat = {
				"a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p-q-r-s-t-u-v-w-x-y-z": "deep",
			}
			const nested = reconstructNestedValues(flat, "-")

			expect((nested as any).a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z).toBe("deep")
		})
	})

	describe("zodSchemaToGunshiArgs - Depth Limiting", () => {
		it("should handle maxDepth 0 (everything as JSON)", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
					nested: z.object({
						value: z.string(),
					}),
				}),
				name: z.string(),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { maxDepth: 0 })

			expect(args.config).toBeDefined()
			expect(args.config.type).toBe("custom")
			expect(args.name).toBeDefined()
		})

		it("should handle exactly at max depth boundary", () => {
			const schema = z.object({
				a: z.object({
					b: z.object({
						c: z.string(),
					}),
				}),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { maxDepth: 2, separator: "-" })

			expect(args["a-b-c"]).toBeDefined()
			expect(args["a-b-c"].type).toBe("string")
		})

		it("should handle maxDepth 1 (one level of nesting)", () => {
			const schema = z.object({
				a: z.object({
					b: z.object({
						c: z.string(),
					}),
				}),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { maxDepth: 1, separator: "-" })

			expect(args["a-b"]).toBeDefined()
			expect(args["a-b"].type).toBe("custom")
		})

		it("should handle mixed: some nested, some at limit", () => {
			const schema = z.object({
				deep: z.object({
					level1: z.object({
						level2: z.object({
							value: z.string(),
						}),
					}),
				}),
				shallow: z.object({
					value: z.string(),
				}),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { maxDepth: 2, separator: "-" })

			expect(args["deep-level1-level2"]).toBeDefined()
			expect(args["deep-level1-level2"].type).toBe("custom")

			expect(args["shallow-value"]).toBeDefined()
			expect(args["shallow-value"].type).toBe("string")
		})

		it("should handle large maxDepth", () => {
			const schema = z.object({
				level1: z.object({
					level2: z.object({
						level3: z.string(),
					}),
				}),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { maxDepth: 10, separator: "-" })

			expect(args["level1-level2-level3"]).toBeDefined()
			expect(args["level1-level2-level3"].type).toBe("string")
		})
	})

	describe("zodSchemaToGunshiArgs - Separator Edge Cases", () => {
		it("should handle underscore separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { separator: "_" })

			expect(args["config_timeout"]).toBeDefined()
			expect(args["config_timeout"].type).toBe("number")
		})

		it("should handle dot separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { separator: "." })

			expect(args["config.timeout"]).toBeDefined()
			expect(args["config.timeout"].type).toBe("number")
		})

		it("should handle empty string separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { separator: "" })

			expect(args["configtimeout"]).toBeDefined()
			expect(args["configtimeout"].type).toBe("number")
		})

		it("should handle separator appearing in original field names", () => {
			const schema = z.object({
				"config-timeout": z.number(),
				config: z.object({
					timeout: z.number(),
				}),
			})

			expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(/collisions/i)
		})

		it("should handle multi-character separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { separator: "__" })

			expect(args["config__timeout"]).toBeDefined()
			expect(args["config__timeout"].type).toBe("number")
		})
	})

	describe("zodSchemaToGunshiArgs - Complex Collisions", () => {
		it("should detect three-way collisions", () => {
			const schema = z.object({
				"foo-bar-baz": z.string(),
				foo: z.object({
					"bar-baz": z.string(),
				}),
				"foo-bar": z.object({
					baz: z.string(),
				}),
			})

			expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(/collisions/i)
		})

		it("should detect collisions at different nesting depths", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.string(),
				}),
				"config-timeout": z.string(),
			})

			expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(/collisions/i)
		})

		it("should detect collisions with objects vs primitives", () => {
			const schema = z.object({
				"user-config": z.string(),
				user: z.object({
					config: z.string(),
				}),
			})

			expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(/collisions/i)
		})

		it("should detect collisions with optional fields", () => {
			const schema = z.object({
				"foo-bar": z.string().optional(),
				foo: z.object({
					bar: z.string().optional(),
				}),
			})

			expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(/collisions/i)
		})

		it("should detect collisions with default values", () => {
			const schema = z.object({
				"foo-bar": z.string().default("default"),
				foo: z.object({
					bar: z.string().default("default"),
				}),
			})

			expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(/collisions/i)
		})

		it("should handle collision at depth boundary", () => {
			const schema = z.object({
				"a-b": z.string(),
				a: z.object({
					b: z.string(),
				}),
			})

			expect(() => zodSchemaToGunshiArgs(schema, {}, { maxDepth: 1, separator: "-" })).toThrow(
				/collisions/i,
			)
		})
	})

	describe("zodSchemaToGunshiArgs - Wrapper Combinations", () => {
		it("should handle optional().default().nullable() chain", () => {
			const schema = z.object({
				value: z.string().optional().default("default").nullable(),
			})

			const args = zodSchemaToGunshiArgs(schema)

			expect(args.value).toBeDefined()
			expect(args.value.required).toBeUndefined()
		})

		it("should handle default().optional().nullable() chain", () => {
			const schema = z.object({
				value: z.string().default("default").optional().nullable(),
			})

			const args = zodSchemaToGunshiArgs(schema)

			expect(args.value).toBeDefined()
			expect(args.value.required).toBeUndefined()
		})

		it("should handle nullable().optional().default() chain", () => {
			const schema = z.object({
				value: z.string().nullable().optional().default("default"),
			})

			const args = zodSchemaToGunshiArgs(schema)

			expect(args.value).toBeDefined()
			expect(args.value.required).toBeUndefined()
		})

		it("should handle wrappers on array fields", () => {
			const schema = z.object({
				items: z.array(z.string()).optional(),
			})

			const args = zodSchemaToGunshiArgs(schema)

			expect(args.items).toBeDefined()
			expect(args.items.required).toBeUndefined()
		})

		it("should handle default() on array fields", () => {
			const schema = z.object({
				items: z.array(z.string()).default([]),
			})

			const args = zodSchemaToGunshiArgs(schema)

			expect(args.items).toBeDefined()
			expect(args.items.required).toBeUndefined()
		})

		it("should handle nullable() on array fields", () => {
			const schema = z.object({
				items: z.array(z.number()).nullable(),
			})

			const args = zodSchemaToGunshiArgs(schema)

			expect(args.items).toBeDefined()
			expect(args.items.required).toBeUndefined()
		})

		it("should handle all three wrappers on array fields", () => {
			const schema = z.object({
				items: z.array(z.string()).optional().default([]).nullable(),
			})

			const args = zodSchemaToGunshiArgs(schema)

			expect(args.items).toBeDefined()
			expect(args.items.required).toBeUndefined()
		})

		it("should handle wrappers on nested objects", () => {
			const schema = z.object({
				config: z
					.object({
						timeout: z.number(),
					})
					.optional()
					.default({ timeout: 30 })
					.nullable(),
			})

			const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

			expect(args["config-timeout"]).toBeDefined()
			expect(args["config-timeout"].required).toBeUndefined()
		})

		it("should handle catch() combined with other wrappers", () => {
			const schema = z.object({
				value: z.string().catch("fallback").optional(),
			})

			const args = zodSchemaToGunshiArgs(schema)

			expect(args.value).toBeDefined()
			expect(args.value.required).toBeUndefined()
		})

		it("should handle wrappers with transformations", () => {
			const schema = z.object({
				value: z
					.string()
					.transform((val) => val.toUpperCase())
					.optional(),
			})

			const args = zodSchemaToGunshiArgs(schema)

			expect(args.value).toBeDefined()
			expect(args.value.required).toBeUndefined()
		})

		it("should handle refine() combined with wrappers", () => {
			const schema = z.object({
				value: z.string().min(5).optional(),
			})

			const args = zodSchemaToGunshiArgs(schema)

			expect(args.value).toBeDefined()
			expect(args.value.required).toBeUndefined()
		})
	})
})
