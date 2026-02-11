import { glob } from "tinyglobby"
import type { GunshiTool } from "../types.ts"
import type { GlobToolDiscoveryOptions } from "./types.ts"
import { DEFAULT_PATTERNS, DEFAULT_IGNORE } from "./types.ts"

export interface ToolManifest {
	name: string
	description?: string
	path: string
	exportKey: "default" | string
}

export interface QuickDiscoveryOptions extends GlobToolDiscoveryOptions {
	strict?: boolean
}

export function quickDiscoverToolManifests(
	options: QuickDiscoveryOptions = {},
): AsyncGenerator<ToolManifest, void, undefined> {
	return (async function* () {
		const patterns = options.patterns ?? DEFAULT_PATTERNS
		const ignore = options.ignore ?? DEFAULT_IGNORE
		const files = await glob(patterns, { cwd: ".", ignore, absolute: true })

		for (const file of files) {
			const manifests = await extractToolManifests(file, options.strict)
			for (const manifest of manifests) {
				yield manifest
			}
		}
	})()
}

async function extractToolManifests(filePath: string, strict?: boolean): Promise<ToolManifest[]> {
	const manifests: ToolManifest[] = []

	try {
		const content = await import("node:fs/promises").then((fs) => fs.readFile(filePath, "utf-8"))

		const defaultManifest = extractJSDocManifest(content, "default")
		if (defaultManifest) {
			manifests.push({
				...defaultManifest,
				path: filePath,
				exportKey: "default",
			})
		}

		const namedExports = extractNamedExportNames(content)
		for (const name of namedExports) {
			const namedManifest = extractJSDocManifest(content, name)
			if (namedManifest) {
				manifests.push({
					...namedManifest,
					path: filePath,
					exportKey: name,
				})
			}
		}
	} catch (error) {
		if (!strict) {
			return []
		}
		throw error
	}

	return manifests
}

function extractJSDocManifest(
	content: string,
	exportKey: string,
): { name: string; description?: string } | null {
	const jsDocRegex = new RegExp(
		`/\\*\\*[\\s\\S]*?\\*/\\s*(export\\s+)?(const|let|var|async\\s+function|function)\\s+${exportKey}\\s*[=:]`,
		"i",
	)
	const match = content.match(jsDocRegex)

	if (!match) {
		return null
	}

	const jsDoc = match[0]

	const nameMatch = jsDoc.match(/@name\s+(\w+)/i)
	const name = nameMatch ? nameMatch[1] : exportKey

	const descMatch = jsDoc.match(/@description\s+([^\n*]+)/i)
	const description = descMatch ? descMatch[1].trim() : undefined

	return { name, description }
}

function extractNamedExportNames(content: string): string[] {
	const names: string[] = []

	const regex = /export\s+(const|let|var|async\s+function|function)\s+(\w+)/g
	let match

	while ((match = regex.exec(content)) !== null) {
		names.push(match[2])
	}

	return names
}

export function createToolLoader(manifest: ToolManifest): () => Promise<GunshiTool> {
	return async () => {
		const mod = await import(manifest.path)
		const tool = manifest.exportKey === "default" ? mod.default : mod[manifest.exportKey]

		if (!tool || typeof tool !== "object" || !("handler" in tool) || !("inputSchema" in tool)) {
			throw new Error(`Invalid tool at ${manifest.path}:${manifest.exportKey}`)
		}

		return tool as GunshiTool
	}
}
