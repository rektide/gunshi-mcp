import { describe, it, expect } from "vitest"
import { reconstructNestedValues } from "../../src/zod-to-gunshi.js"

describe("reconstructNestedValues - Edge Cases", () => {
	it("should handle empty intermediate objects", () => {
		const flat = {
			"a-b": 1,
			"a-c-d": 2,
			z: 3,
		}
		const nested = reconstructNestedValues(flat, "-")

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

	it("should handle arrays in flat values", () => {
		const flat = {
			items: ["a", "b", "c"],
			"nested-items": ["x", "y"],
		}
		const nested = reconstructNestedValues(flat, "-")

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
		const nested = reconstructNestedValues(flat, "-")

		expect(nested).toEqual({
			config: { timeout: 30, retries: 3 },
			name: "test",
		})
	})

	it("should handle overwriting values when same flat key appears multiple times", () => {
		const flat: Record<string, unknown> = {}
		flat["a-b"] = 1
		flat["a-b"] = 2
		const nested = reconstructNestedValues(flat, "-")

		// Last value should win
		expect(nested).toEqual({
			a: {
				b: 2,
			},
		})
	})

	it.skip("should handle deeply nested reconstruction beyond 3 levels", () => {
		const flat = {
			"level1-level2-level3-level4-level5": "deep",
			"level1-level2-level3-level4-level5-level6": "deeper",
		}
		const nested = reconstructNestedValues(flat, "-")

		expect(nested).toEqual({
			level1: {
				level2: {
					level3: {
						level4: {
							level5: {
								level6: "deeper",
							},
						},
					},
				},
			},
		})
	})

	it("should handle mixed depth reconstruction", () => {
		const flat = {
			a: 1,
			"b-c": 2,
			"b-d-e": 3,
			"f-g-h-i": 4,
		}
		const nested = reconstructNestedValues(flat, "-")

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

	it("should handle empty string as value", () => {
		const flat = {
			name: "",
			"nested-value": "",
		}
		const nested = reconstructNestedValues(flat, "-")

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
		const nested = reconstructNestedValues(flat, "-")

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
		const nested = reconstructNestedValues(flat, "-")

		expect(nested).toEqual({
			value: undefined,
			nested: {
				value: undefined,
			},
		})
	})

	it("should handle numeric keys in flat values", () => {
		const flat = {
			"0": "first",
			"1-value": "second",
		}
		const nested = reconstructNestedValues(flat, "-")

		expect(nested).toEqual({
			"0": "first",
			"1": {
				value: "second",
			},
		})
	})

	it("should handle special characters in keys", () => {
		const flat = {
			field_name: "underscore",
			"field-name": "hyphen",
			"field.name": "dot",
		}
		const nested = reconstructNestedValues(flat, ".")

		expect(nested).toEqual({
			field_name: "underscore",
			"field-name": "hyphen",
			field: {
				name: "dot",
			},
		})
	})
})
