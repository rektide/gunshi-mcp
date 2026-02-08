import { describe, it, expect } from "vitest"
import { z } from "zod"
import { flattenSchemaWithContext } from "../../src/schema/flatten/flatten.ts"
import { checkCollisions, formatCollisions } from "../../src/schema/flatten/collision.ts"

describe("Schema Flatten", () => {
	describe("flattenSchemaWithContext", () => {
		it("should flatten simple object schema", () => {
			const schema = z.object({
				name: z.string(),
				age: z.number(),
			})

			const context = flattenSchemaWithContext(schema)

			expect(context.fields).toHaveLength(2)
			expect(context.fields.find((f) => f.key === "name")).toBeDefined()
			expect(context.fields.find((f) => f.key === "age")).toBeDefined()
			expect(context.hasNested).toBe(false)
			expect(context.maxDepth).toBe(3)
			expect(context.collisions.size).toBe(0)
		})

		it("should flatten nested object schema with default separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
					retries: z.number(),
				}),
				name: z.string(),
			})

			const context = flattenSchemaWithContext(schema)

			expect(context.fields).toHaveLength(3)
			expect(context.fields.find((f) => f.key === "config-timeout")).toBeDefined()
			expect(context.fields.find((f) => f.key === "config-retries")).toBeDefined()
			expect(context.fields.find((f) => f.key === "name")).toBeDefined()
			expect(context.hasNested).toBe(true)
		})

		it("should use custom separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "." })

			expect(context.fields).toHaveLength(1)
			expect(context.fields.find((f) => f.key === "config.timeout")).toBeDefined()
		})

		it("should use custom prefix", () => {
			const schema = z.object({
				timeout: z.number(),
			})

			const context = flattenSchemaWithContext(schema, { prefix: "config" })

			expect(context.fields).toHaveLength(1)
			expect(context.fields.find((f) => f.key === "config-timeout")).toBeDefined()
		})

		it("should track depth of flattened fields", () => {
			const schema = z.object({
				level1: z.object({
					level2: z.object({
						value: z.string(),
					}),
				}),
			})

			const context = flattenSchemaWithContext(schema)

			const field = context.fields.find((f) => f.key === "level1-level2-value")
			expect(field).toBeDefined()
			expect(field?.depth).toBe(2)
		})

		it("should track dot paths", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema)

			const field = context.fields.find((f) => f.key === "config-timeout")
			expect(field?.dotPath).toBe("config.timeout")
		})

		it("should handle optional fields", () => {
			const schema = z.object({
				required: z.string(),
				optional: z.string().optional(),
			})

			const context = flattenSchemaWithContext(schema)

			const requiredField = context.fields.find((f) => f.key === "required")
			const optionalField = context.fields.find((f) => f.key === "optional")

			expect(requiredField?.optional).toBe(false)
			expect(optionalField?.optional).toBe(true)
		})

		it("should handle fields with default values", () => {
			const schema = z.object({
				value: z.string().default("default"),
			})

			const context = flattenSchemaWithContext(schema)

			const field = context.fields.find((f) => f.key === "value")
			expect(field?.optional).toBe(true)
			expect(field?.info.default).toBe("default")
		})

		it("should detect collisions", () => {
			const schema = z.object({
				"foo-bar": z.string(),
				foo: z.object({
					bar: z.string(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
			expect(context.collisions.has("foo-bar")).toBe(true)
		})

		it("should handle deep nesting up to maxDepth", () => {
			const schema = z.object({
				level1: z.object({
					level2: z.object({
						level3: z.object({
							value: z.string(),
						}),
					}),
				}),
			})

			const context = flattenSchemaWithContext(schema, { maxDepth: 3 })

			// With maxDepth 3, should fully flatten to level1-level2-level3-value
			expect(context.fields).toHaveLength(1)
			expect(context.fields.find((f) => f.key === "level1-level2-level3-value")).toBeDefined()
		})

		it("should stop at maxDepth = 0", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { maxDepth: 0 })

			expect(context.fields).toHaveLength(0)
		})
	})

	describe("checkCollisions", () => {
		it("should not throw when no collisions", () => {
			const collisions = new Map<string, string[]>()

			expect(() => checkCollisions(collisions)).not.toThrow()
		})

		it("should throw when collisions exist", () => {
			const collisions = new Map<string, string[]>([["foo-bar", ["foo-bar", "foo.bar"]]])

			expect(() => checkCollisions(collisions)).toThrow(/collisions/i)
		})

		it("should throw with detailed collision info", () => {
			const collisions = new Map<string, string[]>([
				["foo-bar", ["foo-bar", "foo.bar"]],
				["a-b-c", ["a-b-c", "a.b.c", "a.b-c"]],
			])

			try {
				checkCollisions(collisions)
				expect.fail("Should have thrown")
			} catch (error) {
				expect((error as Error).message).toContain("foo-bar")
				expect((error as Error).message).toContain("a-b-c")
			}
		})
	})

	describe("formatCollisions", () => {
		it("should return empty string when no collisions", () => {
			const collisions = new Map<string, string[]>()

			expect(formatCollisions(collisions)).toBe("")
		})

		it("should format single collision", () => {
			const collisions = new Map<string, string[]>([["foo-bar", ["foo-bar", "foo.bar"]]])

			const formatted = formatCollisions(collisions)
			expect(formatted).toContain("foo-bar:")
			expect(formatted).toContain("foo-bar, foo.bar")
		})

		it("should format multiple collisions", () => {
			const collisions = new Map<string, string[]>([
				["foo-bar", ["foo-bar", "foo.bar"]],
				["a-b", ["a-b", "a.b"]],
			])

			const formatted = formatCollisions(collisions)
			expect(formatted).toContain("foo-bar:")
			expect(formatted).toContain("a-b:")
		})
	})
})
