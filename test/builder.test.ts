import { describe, it, expect } from "vitest"
import { gunshiMcp } from "../src/builder.ts"

describe("Builder", () => {
	describe("gunshiMcp()", () => {
		it("should create empty plugin array when no plugins added", async () => {
			const plugins = await gunshiMcp().build()
			expect(plugins).toEqual([])
		})

		it("should add logging plugin", async () => {
			const plugins = await gunshiMcp().withLogging().build()
			expect(plugins).toHaveLength(1)
			expect(plugins[0].id).toBe("logging")
		})

		it("should add schema plugin", async () => {
			const plugins = await gunshiMcp().withSchema().build()
			expect(plugins).toHaveLength(1)
			expect(plugins[0].id).toBe("gunshi-mcp:schema")
		})

		it("should add registry plugin", async () => {
			const plugins = await gunshiMcp().withRegistry().build()
			expect(plugins).toHaveLength(1)
			expect(plugins[0].id).toBe("gunshi-mcp:registry")
		})

		it("should add discovery plugin", async () => {
			const plugins = await gunshiMcp().withDiscovery().build()
			expect(plugins).toHaveLength(1)
			expect(plugins[0].id).toBe("gunshi-mcp:discovery")
		})

		it("should add server plugin", async () => {
			const plugins = await gunshiMcp().withServer().build()
			expect(plugins).toHaveLength(1)
			expect(plugins[0].id).toBe("gunshi-mcp:server")
		})

		it("should add cli plugin with auto-included schema", async () => {
			const plugins = await gunshiMcp().withCli().build()
			expect(plugins).toHaveLength(2)
			const ids = plugins.map((p) => p.id)
			expect(ids).toContain("gunshi-mcp:schema")
			expect(ids).toContain("gunshi-mcp:cli")
		})

		it("should not duplicate schema when both schema and cli are added", async () => {
			const plugins = await gunshiMcp().withSchema().withCli().build()
			expect(plugins).toHaveLength(2)
			const schemaPlugins = plugins.filter((p) => p.id === "gunshi-mcp:schema")
			expect(schemaPlugins).toHaveLength(1)
		})

		it("should chain multiple plugins", async () => {
			const plugins = await gunshiMcp()
				.withLogging()
				.withDiscovery()
				.withRegistry()
				.withServer()
				.build()

			expect(plugins).toHaveLength(4)
			const ids = plugins.map((p) => p.id)
			expect(ids).toContain("logging")
			expect(ids).toContain("gunshi-mcp:discovery")
			expect(ids).toContain("gunshi-mcp:registry")
			expect(ids).toContain("gunshi-mcp:server")
		})

		it("should pass options to logging plugin", async () => {
			const plugins = await gunshiMcp().withLogging({ global: false }).build()
			expect(plugins).toHaveLength(1)
		})

		it("should pass options to server plugin", async () => {
			const plugins = await gunshiMcp()
				.withServer({ name: "test-server", version: "1.0.0" })
				.build()
			expect(plugins).toHaveLength(1)
		})

		it("should pass options to cli plugin", async () => {
			const plugins = await gunshiMcp().withCli({ separator: "_", formatFlag: true }).build()
			expect(plugins).toHaveLength(2)
		})

		it("should build full stack", async () => {
			const plugins = await gunshiMcp()
				.withLogging()
				.withDiscovery()
				.withRegistry()
				.withSchema()
				.withServer()
				.withCli()
				.build()

			expect(plugins.length).toBeGreaterThanOrEqual(6)
			const ids = plugins.map((p) => p.id)
			expect(ids).toContain("logging")
			expect(ids).toContain("gunshi-mcp:discovery")
			expect(ids).toContain("gunshi-mcp:registry")
			expect(ids).toContain("gunshi-mcp:schema")
			expect(ids).toContain("gunshi-mcp:server")
			expect(ids).toContain("gunshi-mcp:cli")
		})

		it("should add opencode plugin", async () => {
			const plugins = await gunshiMcp().withOpenCode().build()
			expect(plugins).toHaveLength(1)
			expect(plugins[0].id).toBe("gunshi-mcp:opencode")
		})

		it("should pass options to opencode plugin", async () => {
			const plugins = await gunshiMcp()
				.withOpenCode({ autoExpose: true, include: ["tool1"] })
				.build()
			expect(plugins).toHaveLength(1)
		})
	})

	describe("plugin ordering", () => {
		it("should place discovery before registry", async () => {
			const plugins = await gunshiMcp().withRegistry().withDiscovery().build()

			const discoveryIndex = plugins.findIndex((p) => p.id === "gunshi-mcp:discovery")
			const registryIndex = plugins.findIndex((p) => p.id === "gunshi-mcp:registry")
			expect(discoveryIndex).toBeLessThan(registryIndex)
		})

		it("should place schema before cli", async () => {
			const plugins = await gunshiMcp().withCli().withSchema().build()

			const schemaIndex = plugins.findIndex((p) => p.id === "gunshi-mcp:schema")
			const cliIndex = plugins.findIndex((p) => p.id === "gunshi-mcp:cli")
			expect(schemaIndex).toBeLessThan(cliIndex)
		})

		it("should place registry before server", async () => {
			const plugins = await gunshiMcp().withServer().withRegistry().build()

			const registryIndex = plugins.findIndex((p) => p.id === "gunshi-mcp:registry")
			const serverIndex = plugins.findIndex((p) => p.id === "gunshi-mcp:server")
			expect(registryIndex).toBeLessThan(serverIndex)
		})
	})

	describe("fluent api", () => {
		it("should return builder from each method", () => {
			const builder = gunshiMcp()
			expect(builder.withLogging()).toBe(builder)
			expect(builder.withSchema()).toBe(builder)
			expect(builder.withRegistry()).toBe(builder)
			expect(builder.withDiscovery()).toBe(builder)
			expect(builder.withServer()).toBe(builder)
			expect(builder.withCli()).toBe(builder)
		})
	})
})
