import type { GunshiTool } from "../types.js"
import type { RegistryPluginOptions } from "./types.js"

export class ToolRegistry {
	private tools = new Map<string, GunshiTool>()
	private onConflict: "replace" | "skip" | "error"

	constructor(options: Omit<RegistryPluginOptions, "tools" | "autoDiscover"> = {}) {
		this.onConflict = options.onConflict ?? "skip"
	}

	register(tool: GunshiTool): void {
		if (this.tools.has(tool.name)) {
			switch (this.onConflict) {
				case "replace":
					this.tools.set(tool.name, tool)
					break
				case "skip":
					break
				case "error":
					throw new Error(`Tool '${tool.name}' is already registered`)
			}
			return
		}
		this.tools.set(tool.name, tool)
	}

	unregister(name: string): boolean {
		return this.tools.delete(name)
	}

	list(): readonly GunshiTool[] {
		return Array.from(this.tools.values())
	}

	get(name: string): GunshiTool | undefined {
		return this.tools.get(name)
	}

	has(name: string): boolean {
		return this.tools.has(name)
	}

	get count(): number {
		return this.tools.size
	}

	clear(): void {
		this.tools.clear()
	}

	registerAll(tools: GunshiTool[]): void {
		for (const tool of tools) {
			this.register(tool)
		}
	}
}
