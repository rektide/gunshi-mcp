import { describe, it, expect } from "vitest"
import { z } from "zod"
import { createSchemaPlugin } from "../../src/schema/plugin.js"
import type { GunshiContext } from "gunshi"

function createMockCtx() {
	let capturedExtension: any = null
	return {
		ctx: {
			setExtension: (id: string, extension: any) => {
				if (id === "gunshi-mcp:schema") {
					capturedExtension = extension
				}
			},
		} as unknown as GunshiContext,
		getExtension: () => capturedExtension,
	}
}

describe("Schema Plugin", () => {
	describe("introspect", () => {
		it("should introspect simple schema fields", async () => {
			const plugin = createSchemaPlugin()
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				name: z.string(),
				age: z.number(),
				active: z.boolean(),
			})

			const fields = extension.introspect(schema)

			expect(fields).toHaveLength(3)
			expect(fields[0]).toMatchObject({
				type: "string",
				required: true,
			})
			expect(fields[1]).toMatchObject({
				type: "number",
				required: true,
			})
			expect(fields[2]).toMatchObject({
				type: "boolean",
				required: true,
			})
		})

		it("should handle optional fields", async () => {
			const plugin = createSchemaPlugin()
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				name: z.string(),
				age: z.number().optional(),
			})

			const fields = extension.introspect(schema)

			expect(fields).toHaveLength(2)
			expect(fields[0].required).toBe(true)
			expect(fields[1].required).toBe(false)
		})

		it("should handle default values", async () => {
			const plugin = createSchemaPlugin()
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				name: z.string(),
				count: z.number().default(0),
			})

			const fields = extension.introspect(schema)

			expect(fields).toHaveLength(2)
			expect(fields[0].required).toBe(true)
			expect(fields[1].required).toBe(false)
			expect(fields[1].default).toBe(0)
		})

		it("should handle enum types", async () => {
			const plugin = createSchemaPlugin()
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				status: z.enum(["active", "inactive", "pending"]),
			})

			const fields = extension.introspect(schema)

			expect(fields).toHaveLength(1)
			expect(fields[0].type).toBe("enum")
			expect(fields[0].enumValues).toEqual(["active", "inactive", "pending"])
		})
	})

	describe("flatten", () => {
		it("should flatten simple schema", async () => {
			const plugin = createSchemaPlugin()
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				name: z.string(),
				age: z.number(),
			})

			const flattened = extension.flatten(schema)

			expect(flattened).toHaveLength(2)
			expect(flattened[0]).toMatchObject({
				key: "name",
				depth: 0,
			})
			expect(flattened[1]).toMatchObject({
				key: "age",
				depth: 0,
			})
		})

		it("should flatten nested schema with default separator", async () => {
			const plugin = createSchemaPlugin()
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				name: z.string(),
				config: z.object({
					timeout: z.number(),
					retry: z.number(),
				}),
			})

			const flattened = extension.flatten(schema)

			expect(flattened).toHaveLength(3)
			expect(flattened.find((f: any) => f.key === "name")).toBeDefined()
			expect(flattened.find((f: any) => f.key === "config-timeout")).toBeDefined()
			expect(flattened.find((f: any) => f.key === "config-retry")).toBeDefined()
		})

		it("should support custom separator", async () => {
			const plugin = createSchemaPlugin()
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const flattened = extension.flatten(schema, { separator: "." })

			expect(flattened).toHaveLength(1)
			expect(flattened[0]).toMatchObject({
				key: "config.timeout",
			})
		})

		it("should respect max depth limit", async () => {
			const plugin = createSchemaPlugin()
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				level1: z.object({
					level2: z.object({
						level3: z.string(),
					}),
				}),
			})

			const flattened = extension.flatten(schema, { maxDepth: 2 })

			expect(flattened).toHaveLength(1)
			expect(flattened[0]).toMatchObject({
				key: "level1-level2-level3",
				depth: 2,
			})
		})

		it("should detect collisions", async () => {
			const plugin = createSchemaPlugin()
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
				"config-timeout": z.string(),
			})

			const analysis = extension.analyze(schema)

			expect(analysis.collisions.size).toBeGreaterThan(0)
			expect(analysis.warnings).toHaveLength(1)
			expect(analysis.warnings[0].code).toBe("collision")
		})
	})

	describe("analyze", () => {
		it("should perform complete schema analysis", async () => {
			const plugin = createSchemaPlugin()
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				name: z.string(),
				config: z.object({
					timeout: z.number(),
				}),
			})

			const analysis = extension.analyze(schema)

			expect(analysis).toHaveProperty("fields")
			expect(analysis).toHaveProperty("flattened")
			expect(analysis).toHaveProperty("required")
			expect(analysis).toHaveProperty("hasNested")
			expect(analysis).toHaveProperty("maxDepth")
			expect(analysis).toHaveProperty("collisions")
			expect(analysis).toHaveProperty("isValid")
			expect(analysis).toHaveProperty("warnings")
			expect(analysis).toHaveProperty("errors")

			expect(analysis.hasNested).toBe(true)
			expect(analysis.maxDepth).toBe(3)
			expect(analysis.isValid).toBe(true)
		})

		it("should cache analysis results", async () => {
			const plugin = createSchemaPlugin({ cache: true })
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				name: z.string(),
			})

			const analysis1 = extension.analyze(schema)
			const analysis2 = extension.analyze(schema)

			expect(analysis1).toBe(analysis2)
		})

		it("should not cache when cache disabled", async () => {
			const plugin = createSchemaPlugin({ cache: false })
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				name: z.string(),
			})

			const analysis1 = extension.analyze(schema)
			const analysis2 = extension.analyze(schema)

			expect(analysis1).not.toBe(analysis2)
		})

		it("should throw error in strict mode with collisions", async () => {
			const plugin = createSchemaPlugin()
			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
				"config-timeout": z.string(),
			})

			expect(() => extension.analyze(schema, { strict: true })).toThrow()
		})
	})

	describe("registerTypeHandler", () => {
		it("should allow custom type handlers", async () => {
			const customHandler = (schema: unknown) => {
				return {
					type: "string" as const,
					required: true,
					description: "Custom type",
				}
			}

			const plugin = createSchemaPlugin({
				typeHandlers: {
					ZodCustom: customHandler,
				},
			})

			const { ctx, getExtension } = createMockCtx()

			await plugin.setup(ctx)
			const extension = getExtension()

			extension.registerTypeHandler("ZodAnother", customHandler)

			expect(() => extension.registerTypeHandler("test", customHandler)).not.toThrow()
		})
	})
})
