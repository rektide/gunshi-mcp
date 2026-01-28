import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs } from "../../src/zod-to-gunshi.js"

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

		expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(/foo-bar: foo-bar, foo\.bar/)
	})
})
