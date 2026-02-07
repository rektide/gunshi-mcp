export function checkCollisions(collisions: Map<string, string[]>): void {
	if (collisions.size === 0) return

	const details = [...collisions.entries()]
		.map(([key, paths]) => `  ${key}: ${paths.join(", ")}`)
		.join("\n")

	throw new Error(`CLI flag collisions detected:\n${details}`)
}

export function formatCollisions(collisions: Map<string, string[]>): string {
	if (collisions.size === 0) return ""

	return [...collisions.entries()]
		.map(([key, paths]) => `  ${key}: ${paths.join(", ")}`)
		.join("\n")
}
