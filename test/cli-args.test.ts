import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs, reconstructNestedValues } from "../src/zod-to-gunshi.js"

describe("zodSchemaToGunshiArgs with cli-args module", () => {
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

	it("should detect collisions", () => {
		const schema = z.object({
			"foo-bar": z.string(),
			foo: z.object({
				bar: z.string(),
			}),
		})

		expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(/collisions/i)
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
