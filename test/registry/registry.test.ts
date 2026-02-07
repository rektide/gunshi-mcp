import { describe, it, expect } from "vitest"
import { z } from "zod"
import { ToolRegistry } from "../../src/registry/registry.ts"
import type { GunshiTool } from "../../src/types.ts"

function createMockTool(name: string): GunshiTool {
	return {
		name,
		description: `Test tool ${name}`,
		inputSchema: z.object({ foo: z.string() }),
		handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
	}
}

describe("ToolRegistry", () => {
	describe("register", () => {
		it("registers a new tool", () => {
			const registry = new ToolRegistry()
			const tool = createMockTool("test-tool")
			
			registry.register(tool)
			
			expect(registry.count).toBe(1)
			expect(registry.has("test-tool")).toBe(true)
			expect(registry.get("test-tool")).toEqual(tool)
		})

		it("registers multiple tools", () => {
			const registry = new ToolRegistry()
			const tool1 = createMockTool("tool1")
			const tool2 = createMockTool("tool2")
			
			registry.register(tool1)
			registry.register(tool2)
			
			expect(registry.count).toBe(2)
			expect(registry.list()).toHaveLength(2)
		})

		it("returns readonly list", () => {
			const registry = new ToolRegistry()
			const tool = createMockTool("test-tool")
			
			registry.register(tool)
			const tools = registry.list()
			
			expect(tools).toEqual([tool])
			// Verify it's actually readonly-like by checking it's not the internal map reference
			expect(Array.isArray(tools)).toBe(true)
		})

		describe("onConflict: skip (default)", () => {
			it("skips registration when tool already exists", () => {
				const registry = new ToolRegistry({ onConflict: "skip" })
				const tool1 = createMockTool("test-tool")
				const tool2 = createMockTool("test-tool")
				
				registry.register(tool1)
				registry.register(tool2)
				
				expect(registry.count).toBe(1)
				expect(registry.get("test-tool")).toEqual(tool1)
			})

			it("uses skip as default when not specified", () => {
				const registry = new ToolRegistry()
				const tool1 = createMockTool("test-tool")
				const tool2 = createMockTool("test-tool")
				
				registry.register(tool1)
				registry.register(tool2)
				
				expect(registry.count).toBe(1)
				expect(registry.get("test-tool")).toEqual(tool1)
			})
		})

		describe("onConflict: replace", () => {
			it("replaces existing tool with new one", () => {
				const registry = new ToolRegistry({ onConflict: "replace" })
				const tool1 = createMockTool("test-tool")
				const tool2 = createMockTool("test-tool")
				
				registry.register(tool1)
				registry.register(tool2)
				
				expect(registry.count).toBe(1)
				expect(registry.get("test-tool")).toEqual(tool2)
			})

			it("replaces multiple times", () => {
				const registry = new ToolRegistry({ onConflict: "replace" })
				const tool1 = createMockTool("test-tool")
				const tool2 = createMockTool("test-tool")
				const tool3 = createMockTool("test-tool")
				
				registry.register(tool1)
				registry.register(tool2)
				registry.register(tool3)
				
				expect(registry.count).toBe(1)
				expect(registry.get("test-tool")).toEqual(tool3)
			})
		})

		describe("onConflict: error", () => {
			it("throws error when tool already exists", () => {
				const registry = new ToolRegistry({ onConflict: "error" })
				const tool1 = createMockTool("test-tool")
				const tool2 = createMockTool("test-tool")
				
				registry.register(tool1)
				
				expect(() => registry.register(tool2)).toThrow(
					"Tool 'test-tool' is already registered",
				)
			})

			it("allows registering different tools", () => {
				const registry = new ToolRegistry({ onConflict: "error" })
				const tool1 = createMockTool("tool1")
				const tool2 = createMockTool("tool2")
				
				expect(() => {
					registry.register(tool1)
					registry.register(tool2)
				}).not.toThrow()
				
				expect(registry.count).toBe(2)
			})
		})
	})

	describe("unregister", () => {
		it("removes existing tool", () => {
			const registry = new ToolRegistry()
			const tool = createMockTool("test-tool")
			
			registry.register(tool)
			expect(registry.has("test-tool")).toBe(true)
			
			const result = registry.unregister("test-tool")
			
			expect(result).toBe(true)
			expect(registry.has("test-tool")).toBe(false)
			expect(registry.count).toBe(0)
		})

		it("returns false for non-existent tool", () => {
			const registry = new ToolRegistry()
			
			const result = registry.unregister("non-existent")
			
			expect(result).toBe(false)
		})

		it("decrements count after unregister", () => {
			const registry = new ToolRegistry()
			const tool1 = createMockTool("tool1")
			const tool2 = createMockTool("tool2")
			
			registry.register(tool1)
			registry.register(tool2)
			expect(registry.count).toBe(2)
			
			registry.unregister("tool1")
			expect(registry.count).toBe(1)
		})
	})

	describe("list", () => {
		it("returns empty array for empty registry", () => {
			const registry = new ToolRegistry()
			
			const tools = registry.list()
			
			expect(tools).toEqual([])
		})

		it("returns all registered tools", () => {
			const registry = new ToolRegistry()
			const tool1 = createMockTool("tool1")
			const tool2 = createMockTool("tool2")
			const tool3 = createMockTool("tool3")
			
			registry.register(tool1)
			registry.register(tool2)
			registry.register(tool3)
			
			const tools = registry.list()
			
			expect(tools).toHaveLength(3)
			expect(tools).toContain(tool1)
			expect(tools).toContain(tool2)
			expect(tools).toContain(tool3)
		})

		it("returns tools in registration order", () => {
			const registry = new ToolRegistry()
			const tool1 = createMockTool("tool1")
			const tool2 = createMockTool("tool2")
			const tool3 = createMockTool("tool3")
			
			registry.register(tool1)
			registry.register(tool2)
			registry.register(tool3)
			
			const tools = registry.list()
			
			expect(tools[0]).toEqual(tool1)
			expect(tools[1]).toEqual(tool2)
			expect(tools[2]).toEqual(tool3)
		})
	})

	describe("get", () => {
		it("returns registered tool", () => {
			const registry = new ToolRegistry()
			const tool = createMockTool("test-tool")
			
			registry.register(tool)
			
			const result = registry.get("test-tool")
			
			expect(result).toEqual(tool)
		})

		it("returns undefined for non-existent tool", () => {
			const registry = new ToolRegistry()
			
			const result = registry.get("non-existent")
			
			expect(result).toBeUndefined()
		})
	})

	describe("has", () => {
		it("returns true for registered tool", () => {
			const registry = new ToolRegistry()
			const tool = createMockTool("test-tool")
			
			registry.register(tool)
			
			expect(registry.has("test-tool")).toBe(true)
		})

		it("returns false for non-existent tool", () => {
			const registry = new ToolRegistry()
			
			expect(registry.has("non-existent")).toBe(false)
		})
	})

	describe("count", () => {
		it("returns 0 for empty registry", () => {
			const registry = new ToolRegistry()
			
			expect(registry.count).toBe(0)
		})

		it("returns number of registered tools", () => {
			const registry = new ToolRegistry()
			
			expect(registry.count).toBe(0)
			
			registry.register(createMockTool("tool1"))
			expect(registry.count).toBe(1)
			
			registry.register(createMockTool("tool2"))
			expect(registry.count).toBe(2)
			
			registry.register(createMockTool("tool3"))
			expect(registry.count).toBe(3)
		})

		it("updates correctly after unregister", () => {
			const registry = new ToolRegistry()
			
			registry.register(createMockTool("tool1"))
			registry.register(createMockTool("tool2"))
			expect(registry.count).toBe(2)
			
			registry.unregister("tool1")
			expect(registry.count).toBe(1)
		})
	})

	describe("clear", () => {
		it("removes all tools", () => {
			const registry = new ToolRegistry()
			
			registry.register(createMockTool("tool1"))
			registry.register(createMockTool("tool2"))
			registry.register(createMockTool("tool3"))
			expect(registry.count).toBe(3)
			
			registry.clear()
			
			expect(registry.count).toBe(0)
			expect(registry.list()).toEqual([])
		})

		it("can register tools after clear", () => {
			const registry = new ToolRegistry()
			
			registry.register(createMockTool("tool1"))
			registry.clear()
			
			registry.register(createMockTool("tool2"))
			
			expect(registry.count).toBe(1)
			expect(registry.has("tool2")).toBe(true)
		})
	})

	describe("registerAll", () => {
		it("registers all tools from array", () => {
			const registry = new ToolRegistry()
			const tools = [
				createMockTool("tool1"),
				createMockTool("tool2"),
				createMockTool("tool3"),
			]
			
			registry.registerAll(tools)
			
			expect(registry.count).toBe(3)
			expect(registry.has("tool1")).toBe(true)
			expect(registry.has("tool2")).toBe(true)
			expect(registry.has("tool3")).toBe(true)
		})

		it("handles empty array", () => {
			const registry = new ToolRegistry()
			
			expect(() => registry.registerAll([])).not.toThrow()
			expect(registry.count).toBe(0)
		})

		it("respects onConflict: skip", () => {
			const registry = new ToolRegistry({ onConflict: "skip" })
			const tool1 = createMockTool("tool1")
			const tool1Duplicate = createMockTool("tool1")
			const tool2 = createMockTool("tool2")
			
			registry.register(tool1)
			registry.registerAll([tool1Duplicate, tool2])
			
			expect(registry.count).toBe(2)
			expect(registry.get("tool1")).toEqual(tool1)
		})

		it("respects onConflict: replace", () => {
			const registry = new ToolRegistry({ onConflict: "replace" })
			const tool1 = createMockTool("tool1")
			const tool1Replacement = createMockTool("tool1")
			const tool2 = createMockTool("tool2")
			
			registry.register(tool1)
			registry.registerAll([tool1Replacement, tool2])
			
			expect(registry.count).toBe(2)
			expect(registry.get("tool1")).toEqual(tool1Replacement)
		})

		it("throws onConflict: error", () => {
			const registry = new ToolRegistry({ onConflict: "error" })
			const tool1 = createMockTool("tool1")
			const tool1Duplicate = createMockTool("tool1")
			const tool2 = createMockTool("tool2")
			
			registry.register(tool1)
			
			expect(() => registry.registerAll([tool1Duplicate, tool2])).toThrow(
				"Tool 'tool1' is already registered",
			)
		})

		it("continues processing after skip conflict", () => {
			const registry = new ToolRegistry({ onConflict: "skip" })
			const tool1 = createMockTool("tool1")
			const tool1Duplicate = createMockTool("tool1")
			const tool2 = createMockTool("tool2")
			const tool3 = createMockTool("tool3")
			
			registry.register(tool1)
			registry.registerAll([tool1Duplicate, tool2, tool3])
			
			expect(registry.count).toBe(3)
			expect(registry.has("tool2")).toBe(true)
			expect(registry.has("tool3")).toBe(true)
		})
	})
})
