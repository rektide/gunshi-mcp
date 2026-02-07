import { describe, it, expect } from "vitest"
import { isGunshiTool, extractTools } from "../../src/discovery/tools.ts"
import { z } from "zod"
import type { GunshiTool } from "../../src/types.ts"

describe("isGunshiTool", () => {
	it("returns false for null", () => {
		expect(isGunshiTool(null)).toBe(false)
	})

	it("returns false for undefined", () => {
		expect(isGunshiTool(undefined)).toBe(false)
	})

	it("returns false for non-objects", () => {
		expect(isGunshiTool("string")).toBe(false)
		expect(isGunshiTool(123)).toBe(false)
		expect(isGunshiTool([])).toBe(false)
	})

	it("returns false for object missing name", () => {
		const obj = {
			handler: () => {},
			inputSchema: z.object({}),
		}
		expect(isGunshiTool(obj)).toBe(false)
	})

	it("returns false for object missing handler", () => {
		const obj = {
			name: "test",
			inputSchema: z.object({}),
		}
		expect(isGunshiTool(obj)).toBe(false)
	})

	it("returns false for object with non-function handler", () => {
		const obj = {
			name: "test",
			handler: "not a function",
			inputSchema: z.object({}),
		}
		expect(isGunshiTool(obj)).toBe(false)
	})

	it("returns false for object missing inputSchema", () => {
		const obj = {
			name: "test",
			handler: () => {},
		}
		expect(isGunshiTool(obj)).toBe(false)
	})

	it("returns true for valid GunshiTool", () => {
		const tool: GunshiTool = {
			name: "test",
			description: "A test tool",
			inputSchema: z.object({ foo: z.string() }),
			handler: async () => ({
				content: [{ type: "text", text: "ok" }],
			}),
		}
		expect(isGunshiTool(tool)).toBe(true)
	})

	it("returns true for GunshiTool with optional fields", () => {
		const tool: GunshiTool = {
			name: "test",
			description: "A test tool",
			inputSchema: z.object({ foo: z.string() }),
			outputSchema: z.string(),
			handler: async () => ({
				content: [{ type: "text", text: "ok" }],
			}),
			cli: {},
			cliOptions: {},
		}
		expect(isGunshiTool(tool)).toBe(true)
	})
})

describe("extractTools", () => {
	it("returns empty array for null", () => {
		expect(extractTools(null)).toEqual([])
	})

	it("returns empty array for undefined", () => {
		expect(extractTools(undefined)).toEqual([])
	})

	it("returns empty array for non-object", () => {
		expect(extractTools("string")).toEqual([])
		expect(extractTools(123)).toEqual([])
	})

	it("returns empty array for empty object", () => {
		expect(extractTools({})).toEqual([])
	})

	it("extracts tool from default export", () => {
		const tool: GunshiTool = {
			name: "default-tool",
			description: "Default export tool",
			inputSchema: z.object({}),
			handler: async () => ({
				content: [{ type: "text", text: "ok" }],
			}),
		}
		const mod = { default: tool }
		expect(extractTools(mod)).toEqual([tool])
	})

	it("extracts tool from named export", () => {
		const tool: GunshiTool = {
			name: "named-tool",
			description: "Named export tool",
			inputSchema: z.object({}),
			handler: async () => ({
				content: [{ type: "text", text: "ok" }],
			}),
		}
		const mod = { namedTool: tool }
		expect(extractTools(mod)).toEqual([tool])
	})

	it("extracts multiple named tools", () => {
		const tool1: GunshiTool = {
			name: "tool1",
			description: "First tool",
			inputSchema: z.object({}),
			handler: async () => ({
				content: [{ type: "text", text: "ok" }],
			}),
		}
		const tool2: GunshiTool = {
			name: "tool2",
			description: "Second tool",
			inputSchema: z.object({}),
			handler: async () => ({
				content: [{ type: "text", text: "ok" }],
			}),
		}
		const mod = { tool1, tool2 }
		const result = extractTools(mod)
		expect(result).toHaveLength(2)
		expect(result).toContain(tool1)
		expect(result).toContain(tool2)
	})

	it("extracts both default and named tools", () => {
		const defaultTool: GunshiTool = {
			name: "default",
			description: "Default tool",
			inputSchema: z.object({}),
			handler: async () => ({
				content: [{ type: "text", text: "ok" }],
			}),
		}
		const namedTool: GunshiTool = {
			name: "named",
			description: "Named tool",
			inputSchema: z.object({}),
			handler: async () => ({
				content: [{ type: "text", text: "ok" }],
			}),
		}
		const mod = { default: defaultTool, namedTool }
		const result = extractTools(mod)
		expect(result).toHaveLength(2)
		expect(result).toContain(defaultTool)
		expect(result).toContain(namedTool)
	})

	it("ignores non-tool exports", () => {
		const tool: GunshiTool = {
			name: "tool",
			description: "A tool",
			inputSchema: z.object({}),
			handler: async () => ({
				content: [{ type: "text", text: "ok" }],
			}),
		}
		const mod = {
			tool,
			notATool: "string",
			alsoNotATool: 123,
			objectButNotTool: { name: "fake" },
		}
		const result = extractTools(mod)
		expect(result).toEqual([tool])
	})
})
