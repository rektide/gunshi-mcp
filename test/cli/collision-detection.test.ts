import { describe, it, expect } from "vitest"
import { z } from "zod"
import { flattenSchemaWithContext } from "../../src/schema/flatten/flatten.ts"

describe("CLI - Collision Detection", () => {
	describe("simple collisions", () => {
		it("should detect collision with flat key and nested path", () => {
			const schema = z.object({
				"config-timeout": z.string(),
				config: z.object({
					timeout: z.string(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
			expect(context.collisions.has("config-timeout")).toBe(true)
		})
	})

	describe("multi-way collisions", () => {
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

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
			expect(context.collisions.has("foo-bar-baz")).toBe(true)
			expect(context.collisions.get("foo-bar-baz")).toHaveLength(3)
		})

		it("should detect collisions at different nesting depths", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.string(),
				}),
				"config-timeout": z.string(),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
			expect(context.collisions.has("config-timeout")).toBe(true)
		})

		it("should detect collisions with objects vs primitives", () => {
			const schema = z.object({
				"user-config": z.string(),
				user: z.object({
					config: z.string(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
			expect(context.collisions.has("user-config")).toBe(true)
		})
	})

	describe("collisions with wrappers", () => {
		it("should detect collisions with optional fields", () => {
			const schema = z.object({
				"foo-bar": z.string().optional(),
				foo: z.object({
					bar: z.string().optional(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
		})

		it("should detect collisions with default values", () => {
			const schema = z.object({
				"foo-bar": z.string().default("default"),
				foo: z.object({
					bar: z.string().default("default"),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
		})
	})

	describe("collision at depth boundary", () => {
		it("should handle collision at depth boundary", () => {
			const schema = z.object({
				"a-b": z.string(),
				a: z.object({
					b: z.string(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-", maxDepth: 1 })

			expect(context.collisions.size).toBe(1)
			expect(context.collisions.has("a-b")).toBe(true)
		})
	})

	describe("separator collision with field names", () => {
		it("should detect separator collision with field names", () => {
			const schema = z.object({
				"config-timeout": z.number(),
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
		})

		it("should not have collision with different separators", () => {
			const schema = z.object({
				"config.timeout": z.number(),
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "_" })

			expect(context.collisions.size).toBe(0)
		})
	})
})
