import { describe, it, expect } from "vitest"
import { reconstructNested } from "../../src/cli/values/reconstruct.ts"

describe("CLI - Reconstruction Edge Cases", () => {
	describe("basic edge cases", () => {
		it("should handle empty object", () => {
			const flat = {}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({})
		})

		it("should handle empty string as value", () => {
			const flat = {
				name: "",
				"nested-value": "",
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				name: "",
				nested: {
					value: "",
				},
			})
		})

		it("should handle null as value", () => {
			const flat = {
				value: null,
				"nested-value": null,
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				value: null,
				nested: {
					value: null,
				},
			})
		})

		it("should handle undefined as value", () => {
			const flat = {
				value: undefined,
				"nested-value": undefined,
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				value: undefined,
				nested: {
					value: undefined,
				},
			})
		})

		it("should handle zero as value", () => {
			const flat = {
				count: 0,
				"nested-value": 0,
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				count: 0,
				nested: {
					value: 0,
				},
			})
		})

		it("should handle false as value", () => {
			const flat = {
				enabled: false,
				"nested-enabled": false,
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				enabled: false,
				nested: {
					enabled: false,
				},
			})
		})
	})

	describe("arrays and objects in values", () => {
		it("should handle arrays in flat values", () => {
			const flat = {
				items: ["a", "b", "c"],
				"nested-items": ["x", "y"],
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				items: ["a", "b", "c"],
				nested: {
					items: ["x", "y"],
				},
			})
		})

		it("should handle objects in flat values", () => {
			const flat = {
				config: { timeout: 30, retries: 3 },
				name: "test",
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				config: { timeout: 30, retries: 3 },
				name: "test",
			})
		})
	})

	describe("deep nesting", () => {
		it("should handle deeply nested reconstruction beyond 3 levels", () => {
			const flat = {
				"level1-level2-level3-level4-level5": "deep",
			}
			const nested = reconstructNested(flat, "-")

			expect((nested as any).level1.level2.level3.level4.level5).toBe("deep")
		})

		it("should handle mixed depth reconstruction", () => {
			const flat = {
				a: 1,
				"b-c": 2,
				"b-d-e": 3,
				"f-g-h-i": 4,
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				a: 1,
				b: {
					c: 2,
					d: {
						e: 3,
					},
				},
				f: {
					g: {
						h: {
							i: 4,
						},
					},
				},
			})
		})
	})

	describe("overwriting values", () => {
		it("should handle overwriting values when same flat key appears multiple times", () => {
			const flat: Record<string, unknown> = {}
			flat["a-b"] = 1
			flat["a-b"] = 2
			const nested = reconstructNested(flat, "-")

			// Last value should win
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
			const nested = reconstructNested(flat, "-")

			// The flat value should overwrite the nested value
			expect(nested).toEqual({
				a: {
					b: 2,
				},
			})
		})
	})

	describe("special characters in keys", () => {
		it("should handle numeric keys in flat values", () => {
			const flat = {
				"0": "first",
				"1-value": "second",
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				"0": "first",
				"1": {
					value: "second",
				},
			})
		})

		it("should handle special characters in keys with dot separator", () => {
			const flat = {
				field_name: "underscore",
				"field-name": "hyphen",
				"field.name": "dot",
			}
			const nested = reconstructNested(flat, ".")

			expect(nested).toEqual({
				field_name: "underscore",
				"field-name": "hyphen",
				field: {
					name: "dot",
				},
			})
		})
	})

	describe("custom separators", () => {
		it("should handle very long nested paths", () => {
			const flat = {
				"a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p-q-r-s-t-u-v-w-x-y-z": "deep",
			}
			const nested = reconstructNested(flat, "-")

			expect((nested as any).a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z).toBe("deep")
		})

		it("should handle underscore separator with nested paths", () => {
			const flat = {
				"a_b_c": "value",
				"x_y": "nested",
			}
			const nested = reconstructNested(flat, "_")

			expect(nested).toEqual({
				a: {
					b: {
						c: "value",
					},
				},
				x: {
					y: "nested",
				},
			})
		})

		it("should handle dot separator with nested paths", () => {
			const flat = {
				"a.b.c": "value",
				"x.y": "nested",
			}
			const nested = reconstructNested(flat, ".")

			expect(nested).toEqual({
				a: {
					b: {
						c: "value",
					},
				},
				x: {
					y: "nested",
				},
			})
		})
	})

	describe("empty intermediate objects", () => {
		it("should handle empty intermediate objects", () => {
			const flat = {
				"a-b": 1,
				"a-c-d": 2,
				z: 3,
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				a: {
					b: 1,
					c: {
						d: 2,
					},
				},
				z: 3,
			})
		})
	})

	describe("malformed or inconsistent input", () => {

		it("should handle separator in key value not creating intermediate objects", () => {
			const flat = {
				"a-b-c": "value",
			}
			const nested = reconstructNested(flat, "-")

			expect(nested).toEqual({
				a: {
					b: {
						c: "value",
					},
				},
			})
		})
	})
})
