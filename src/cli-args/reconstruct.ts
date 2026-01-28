export function reconstructNested(
	flatValues: Record<string, unknown>,
	separator = "-",
): Record<string, unknown> {
	const result: Record<string, unknown> = {}

	for (const [flatKey, value] of Object.entries(flatValues)) {
		const parts = flatKey.split(separator)
		let target = result

		for (let i = 0; i < parts.length - 1; i++) {
			target[parts[i]] ??= {}
			target = target[parts[i]] as Record<string, unknown>
		}

		target[parts[parts.length - 1]] = value
	}

	return result
}
