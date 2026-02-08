import { describe, it, expect } from "vitest"
import { z } from "zod"
import { checkCollisions, formatCollisions } from "../../src/schema/flatten/collision.ts"
import { flattenSchemaWithContext } from "../../src/schema/flatten/flatten.ts"
import { reconstructNested } from "../../src/cli/values/reconstruct.ts"
import { parseValue } from "../../src/cli/values/parse.ts"

describe("CLI - Error Scenarios", () => {
	describe("schema errors", () => {
		it("should handle collision errors with checkCollisions", () => {
			const collisions = new Map<string, string[]>([["foo-bar", ["foo-bar", "foo.bar"]]])

			expect(() => checkCollisions(collisions)).toThrow(/collisions/i)
		})

		it("should provide detailed error message for collisions", () => {
			const collisions = new Map<string, string[]>([["foo-bar", ["foo-bar", "foo.bar"]]])

			try {
				checkCollisions(collisions)
				expect.fail("Should have thrown")
			} catch (error) {
				expect((error as Error).message).toContain("CLI flag collisions detected")
				expect((error as Error).message).toContain("foo-bar")
			}
		})

		it("should format collisions", () => {
			const collisions = new Map<string, string[]>([["foo-bar", ["foo-bar", "foo.bar"]]])

			const formatted = formatCollisions(collisions)
			expect(formatted).toContain("foo-bar:")
			expect(formatted).toContain("foo-bar, foo.bar")
		})
	})

	describe("reconstruction errors", () => {
		it("should handle empty flat values", () => {
			const flat: Record<string, unknown> = {}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({})
		})

		it("should handle flat values with missing intermediate paths", () => {
			const flat = {
				"a-b-c": 1,
				z: 3,
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				a: {
					b: {
						c: 1,
					},
				},
				z: 3,
			})
		})
	})

	describe("parse errors", () => {
		it("should handle invalid number parsing", () => {
			const result = parseValue("not a number", "number", {})
			expect(Number.isNaN(result)).toBe(true)
		})

		it("should handle invalid JSON parsing for arrays", () => {
			expect(() => parseValue("not json", "array", { arrayHandling: "json" })).toThrow()
		})

		it("should handle invalid JSON parsing for objects", () => {
			expect(() => parseValue("not json", "object", {})).toThrow()
		})

		it("should handle valid JSON parsing for arrays", () => {
			const result = parseValue('["a","b","c"]', "array", { arrayHandling: "json" })
			expect(result).toEqual(["a", "b", "c"])
		})

		it("should handle valid JSON parsing for objects", () => {
			const result = parseValue('{"foo":"bar"}', "object", {})
			expect(result).toEqual({ foo: "bar" })
		})

		it("should handle repeated array parsing", () => {
			const result = parseValue("a,b,c", "array", { arrayHandling: "repeated" })
			expect(result).toEqual(["a", "b", "c"])
		})
	})

	describe("inconsistent nesting", () => {
		it("should handle reconstruction with inconsistent nesting", () => {
			const flat = {
				"a-b-c": 1,
				"x-y": 2,
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				a: {
					b: {
						c: 1,
					},
				},
				x: {
					y: 2,
				},
			})
		})
	})

	describe("separator collision", () => {
		it("should handle separator collision with field names", () => {
			const schema = z.object({
				"foo-bar": z.string(),
				foo: z.object({
					bar: z.string(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
		})
	})

	describe("very long nested paths", () => {
		it("should handle very long nested paths", () => {
			const flat = {
				"a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p-q-r-s-t-u-v-w-x-y-z": "deep",
			}
			const nested = reconstructNested(flat, "-")

			expect((nested as any).a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z).toBe("deep")
		})
	})

	describe("special characters in keys", () => {
		it("should handle keys with special characters using dot separator", () => {
			const flat = {
				"field with spaces": "value1",
				"field-with-hyphens": "value2",
				field_with_underscores: "value3",
			}
			const nested = reconstructNested(flat, ".")

			expect(nested["field with spaces"]).toBe("value1")
			expect(nested["field-with-hyphens"]).toBe("value2")
			expect(nested.field_with_underscores).toBe("value3")
		})
	})

	describe("edge case values", () => {
		it("should handle falsy values", () => {
			const flat = {
				falseValue: false,
				zeroValue: 0,
				emptyString: "",
				nullValue: null,
			}
			const nested = reconstructNested(flat, "-")

			expect(nested.falseValue).toBe(false)
			expect(nested.zeroValue).toBe(0)
			expect(nested.emptyString).toBe("")
			expect(nested.nullValue).toBe(null)
		})

		it("should handle nested falsy values", () => {
			const flat = {
				"a-false": false,
				"a-b-zero": 0,
			}
			const nested = reconstructNested(flat, "-")

			expect((nested as any).a.false).toBe(false)
			expect((nested as any).a.b.zero).toBe(0)
		})
	})
})
