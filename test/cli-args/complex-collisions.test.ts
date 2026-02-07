import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs } from "../../src/zod-to-gunshi.ts"

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
		// Zod won't actually allow duplicate keys in the same object,
		// but we can test with field names that flatten to the same thing
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
