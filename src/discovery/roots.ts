import { packageDirectory } from "package-directory"
import type { RootDiscovery } from "./types.ts"

export async function* defaultRootDiscovery(): AsyncGenerator<string> {
	const root = await packageDirectory()
	if (root) {
		yield root
	}
}

export function explicitRoots(...dirs: string[]): RootDiscovery {
	return async function* () {
		for (const dir of dirs) {
			yield dir
		}
	}
}

export function chainRoots(...strategies: RootDiscovery[]): RootDiscovery {
	return async function* () {
		for (const strategy of strategies) {
			yield* strategy()
		}
	}
}
