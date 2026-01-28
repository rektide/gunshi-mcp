import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs } from "../../src/zod-to-gunshi.js"

describe("zodSchemaToGunshiArgs - Array Handling", () => {
	it("should handle arrays with repeated parser (default)", () => {
		const schema = z.object({
			items: z.array(z.string()),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { arrayHandling: "repeated" })

		expect(args.items).toBeDefined()
		expect(args.items.type).toBe("custom")
		expect(args.items.parse).toBeDefined()
	})

	it("should handle arrays with JSON parser", () => {
		const schema = z.object({
			items: z.array(z.string()),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { arrayHandling: "json" })

		expect(args.items).toBeDefined()
		expect(args.items.type).toBe("custom")
		expect(args.items.parse).toBeDefined()
	})

	it("should parse repeated arrays with comma-separated values", () => {
		const schema = z.object({
			items: z.array(z.string()),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { arrayHandling: "repeated" })

		expect(() => args.items?.parse?.("a,b,c")).not.toThrow()
	})

	it.skip("should parse JSON arrays as JSON string", () => {
		const schema = z.object({
			items: z.array(z.number()),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { arrayHandling: "json" })

		const result = args.items?.parse?.("[1, 2, 3]")
		expect(result).toEqual([1, 2, 3])
	})

	it("should handle arrays of objects with repeated handling", () => {
		const schema = z.object({
			objects: z.array(
				z.object({
					name: z.string(),
				}),
			),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { arrayHandling: "repeated" })

		expect(args.objects).toBeDefined()
		expect(args.objects?.parse).toBeDefined()
	})

	it.skip("should handle arrays of objects at max depth", () => {
		const schema = z.object({
			config: z.object({
				items: z.array(z.string()),
			}),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { maxDepth: 1, separator: "-" })

		// At max depth, arrays should still be handled
		expect(args["config"]).toBeDefined()
	})

	it("should handle arrays with optional wrapper", () => {
		const schema = z.object({
			items: z.array(z.string()).optional(),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.items).toBeDefined()
		expect(args.items.required).toBeUndefined()
	})

	it("should handle arrays with default wrapper", () => {
		const schema = z.object({
			items: z.array(z.string()).default([]),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.items).toBeDefined()
		expect(args.items.required).toBeUndefined()
	})

	it("should handle arrays with nullable wrapper", () => {
		const schema = z.object({
			items: z.array(z.number()).nullable(),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.items).toBeDefined()
		expect(args.items.required).toBeUndefined()
	})

	it("should handle arrays with multiple wrappers", () => {
		const schema = z.object({
			items: z.array(z.string()).optional().default([]),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.items).toBeDefined()
		expect(args.items.required).toBeUndefined()
	})

	it.skip("should handle multi-type arrays (union types)", () => {
		const schema = z.object({
			items: z.array(z.union([z.string(), z.number()])),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.items).toBeDefined()
	})
})
