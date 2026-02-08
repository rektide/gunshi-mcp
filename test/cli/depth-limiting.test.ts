import { describe, it, expect } from "vitest"
import { z } from "zod"
import { flattenSchemaWithContext } from "../../src/schema/flatten/flatten.ts"

describe("CLI - Depth Limiting", () => {
	describe("maxDepth behavior", () => {
		it("should flatten with default maxDepth", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
				name: z.string(),
			})

			const context = flattenSchemaWithContext(schema)

			// Default maxDepth is 3, should flatten fully
			expect(context.fields).toHaveLength(2)
			expect(context.fields.find((f) => f.key === "config-timeout")).toBeDefined()
			expect(context.fields.find((f) => f.key === "name")).toBeDefined()
		})

		it("should handle nested schemas at default maxDepth", () => {
			const schema = z.object({
				a: z.object({
					b: z.object({
						c: z.string(),
					}),
				}),
			})

			const context = flattenSchemaWithContext(schema)

			// With default maxDepth 3, should fully flatten
			expect(context.fields).toHaveLength(1)
			expect(context.fields[0].key).toBe("a-b-c")
			expect(context.fields[0].info.type).toBe("string")
		})

		it("should track maxDepth in context", () => {
			const schema = z.object({
				a: z.string(),
			})

			const context = flattenSchemaWithContext(schema, { maxDepth: 5 })

			expect(context.maxDepth).toBe(5)
		})
	})

	describe("maxDepth with different schemas", () => {
		it("should handle multiple fields at different depths", () => {
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
				top: z.string(),
			})

			const context = flattenSchemaWithContext(schema)

			expect(context.fields).toHaveLength(3)
			expect(context.fields.find((f) => f.key === "deep-level1-level2-value")).toBeDefined()
			expect(context.fields.find((f) => f.key === "shallow-value")).toBeDefined()
			expect(context.fields.find((f) => f.key === "top")).toBeDefined()
		})

		it("should handle nested objects with multiple fields", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
					retries: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema)

			expect(context.fields).toHaveLength(2)
			expect(context.fields.find((f) => f.key === "config-timeout")).toBeDefined()
			expect(context.fields.find((f) => f.key === "config-retries")).toBeDefined()
		})
	})

	describe("maxDepth with prefix", () => {
		it("should combine prefix with flattening", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { prefix: "app" })

			expect(context.fields).toHaveLength(1)
			expect(context.fields[0].key).toBe("app-config-timeout")
		})

		it("should combine prefix with custom separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { prefix: "app", separator: "_" })

			expect(context.fields[0].key).toBe("app_config_timeout")
		})
	})

	describe("hasNested flag", () => {
		it("should set hasNested for nested schemas", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema)

			expect(context.hasNested).toBe(true)
		})

		it("should not set hasNested for flat schemas", () => {
			const schema = z.object({
				name: z.string(),
				age: z.number(),
			})

			const context = flattenSchemaWithContext(schema)

			expect(context.hasNested).toBe(false)
		})
	})
})
