import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs } from "../../src/zod-to-gunshi.js"

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
