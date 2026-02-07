export interface ValidationResult {
	isValid: boolean
	required: string[]
	missing: string[]
}

export function validateRequiredFields(
	flattenedFields: { key: string; optional: boolean }[],
): ValidationResult {
	const missing: string[] = []
	const required: string[] = []

	for (const field of flattenedFields) {
		if (!field.optional) {
			required.push(field.key)
		}
	}

	return {
		isValid: missing.length === 0,
		required,
		missing,
	}
}
