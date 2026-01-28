import type { FlattenContext } from "./flatten.js"

export function checkCollisions(context: FlattenContext): void {
	if (context.collisions.size === 0) return

	const details = [...context.collisions.entries()]
		.map(([key, paths]) => `  ${key}: ${paths.join(", ")}`)
		.join("\n")

	throw new Error(`CLI flag collisions detected:\n${details}`)
}
