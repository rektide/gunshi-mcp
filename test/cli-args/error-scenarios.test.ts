import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs, reconstructNestedValues } from "../../src/zod-to-gunshi.js"

describe("CLI Args - Error Scenarios", () => {
	it.skip("should handle invalid Zod schemas gracefully", () => {
		// Need a way to test invalid schema handling
		// This might need try/catch around schema creation
	})

	it("should handle malformed flat values for reconstruction", () => {
		// Empty flat values should still work
		const flat: Record<string, unknown> = {}
		const nested = reconstructNestedValues(flat, "-")
		expect(nested).toEqual({})
	})

	it.skip("should handle null flat values", () => {
		const flat = null as unknown as Record<string, unknown>
		const nested = reconstructNestedValues(flat, "-")
		expect(nested).toEqual({})
	})

	it.skip("should handle undefined flat values", () => {
		const flat = undefined as unknown as Record<string, unknown>
		const nested = reconstructNestedValues(flat, "-")
		expect(nested).toEqual({})
	})

	it("should handle parse function errors", () => {
		const schema = z.object({
			custom: z.string(),
		})

		const args = zodSchemaToGunshiArgs(schema, {
			custom: {
				parse: (_value: string) => {
					throw new Error("Parse error")
				},
			},
		})

		expect(() => args.custom?.parse?.("test")).toThrow("Parse error")
	})

	it("should handle parse function returning invalid type", () => {
		const schema = z.object({
			count: z.number(),
		})

		const args = zodSchemaToGunshiArgs(schema, {
			count: {
				parse: (_value: string) => "not a number",
			},
		})

		const result = args.count?.parse?.("123")
		expect(result).toBe("not a number")
	})

	it.skip("should handle reconstruction with inconsistent nesting", () => {
		const flat = {
			"a-b": 1,
			"a-b-c": 2,
		}
		const nested = reconstructNestedValues(flat, "-")

		// The second value should overwrite the first
		expect(nested).toEqual({
			a: {
				b: 2,
			},
		})
	})

	it("should handle reconstruction with overlapping paths", () => {
		const flat = {
			a: { b: 1 },
			"a-b": 2,
		}
		const nested = reconstructNestedValues(flat, "-")

		// The flat value should overwrite the nested value
		expect(nested).toEqual({
			a: {
				b: 2,
			},
		})
	})

	it("should handle separator collision with field names", () => {
		const schema = z.object({
			"foo-bar": z.string(),
			foo: z.object({
				bar: z.string(),
			}),
		})

		expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(/collisions/i)
	})

	it("should handle very long nested paths", () => {
		const flat = {
			"a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p-q-r-s-t-u-v-w-x-y-z": "deep",
		}
		const nested = reconstructNestedValues(flat, "-")

		expect((nested as any).a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z).toBe("deep")
	})

	it.skip("should handle reconstruction with special characters in keys", () => {
		const flat = {
			"field with spaces": "value1",
			"field-with-hyphens": "value2",
			field_with_underscores: "value3",
		}
		const nested = reconstructNestedValues(flat, "-")

		expect(nested["field with spaces"]).toBe("value1")
		expect(nested["field-with-hyphens"]).toBe("value2")
		expect(nested["field_with_underscores"]).toBe("value3")
	})
})
