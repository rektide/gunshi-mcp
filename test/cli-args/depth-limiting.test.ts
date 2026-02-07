import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs } from "../../src/zod-to-gunshi.ts"

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

		// At depth 0, should not flatten at all
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

		// At depth 2, "a-b-c" should be at limit (0-indexed, so 3 levels)
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

		// Deep path at limit
		expect(args["deep-level1-level2"]).toBeDefined()
		expect(args["deep-level1-level2"].type).toBe("custom")

		// Shallow path fully flattened
		expect(args["shallow-value"]).toBeDefined()
		expect(args["shallow-value"].type).toBe("string")
	})

	it.skip("should handle maxDepth 3 with deeply nested schema", () => {
		const schema = z.object({
			level1: z.object({
				level2: z.object({
					level3: z.object({
						level4: z.string(),
					}),
				}),
			}),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { maxDepth: 3, separator: "-" })

		expect(args["level1-level2-level3"]).toBeDefined()
		expect(args["level1-level2-level3"].type).toBe("custom")
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
