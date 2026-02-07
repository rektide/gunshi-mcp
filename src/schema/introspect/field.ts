import type { z } from "zod"
import type { ZodFieldInfo } from "../types.js"

export function introspectZodField(schema: unknown): ZodFieldInfo {
	let inner = schema
	let required = true
	let defaultValue: unknown
	let description = undefined as string | undefined
	let depth = 0
	const maxDepth = 10

	if (typeof inner === "object" && inner !== null && "description" in inner) {
		description = inner.description as string | undefined
	}

	while (depth < maxDepth) {
		const schemaType = (inner as { type?: string }).type

		if (schemaType === "optional") {
			required = false
			if (typeof (inner as { unwrap?: () => unknown }).unwrap === "function") {
				inner = (inner as { unwrap: () => unknown }).unwrap()
			}
			depth++
			continue
		} else if (schemaType === "nullable") {
			required = false
			if (typeof (inner as { unwrap?: () => unknown }).unwrap === "function") {
				inner = (inner as { unwrap: () => unknown }).unwrap()
			}
			depth++
			continue
		} else if (schemaType === "catch") {
			required = false
			if (typeof (inner as { unwrap?: () => unknown }).unwrap === "function") {
				inner = (inner as { unwrap: () => unknown }).unwrap()
			}
			depth++
			continue
		} else if (schemaType === "default") {
			const def = (inner as { _def?: { defaultValue: unknown } })._def
			if (def && "defaultValue" in def) {
				if (typeof def.defaultValue === "function") {
					try {
						defaultValue = (def.defaultValue as () => unknown)()
					} catch {}
				} else {
					defaultValue = def.defaultValue
				}
			}
			required = false
			if (typeof (inner as { unwrap?: () => unknown }).unwrap === "function") {
				inner = (inner as { unwrap: () => unknown }).unwrap()
			}
			depth++
			continue
		} else {
			break
		}
	}

	if (!description && typeof inner === "object" && inner !== null && "description" in inner) {
		description = inner.description as string | undefined
	}

	let typeName: string | undefined
	if (typeof inner === "object" && inner !== null && "type" in inner) {
		typeName = (inner as { type?: string }).type
	}

	switch (typeName) {
		case "string":
			return { type: "string", required, default: defaultValue, description }
		case "number":
			return { type: "number", required, default: defaultValue, description }
		case "boolean":
			return { type: "boolean", required, default: defaultValue, description }
		case "enum": {
			const values =
				typeof inner === "object" &&
				inner !== null &&
				"enum" in inner &&
				typeof inner.enum === "object"
					? Object.values(inner.enum as Record<string, string>)
					: undefined
			return {
				type: "enum",
				required,
				default: defaultValue,
				description,
				enumValues: values,
			}
		}
		case "array":
			return { type: "array", required, default: defaultValue, description }
		case "object":
			return { type: "object", required, default: defaultValue, description }
		default:
			return { type: "string", required, default: defaultValue, description }
	}
}

export function isZodObject(schema: unknown): schema is z.ZodObject<any> {
	return (
		typeof schema === "object" &&
		schema !== null &&
		"shape" in schema &&
		typeof (schema as any).shape === "object"
	)
}

export function unwrapZodWrappers(schema: unknown): unknown {
	let inner = schema
	const maxDepth = 10
	let depth = 0

	while (depth < maxDepth) {
		const schemaType = (inner as { type?: string }).type

		if (
			schemaType === "optional" ||
			schemaType === "default" ||
			schemaType === "nullable" ||
			schemaType === "catch"
		) {
			if (typeof (inner as { unwrap?: () => unknown }).unwrap === "function") {
				inner = (inner as { unwrap: () => unknown }).unwrap()
			} else if (typeof (inner as { _def?: { innerType: unknown } })._def === "object") {
				const def = (inner as { _def: { innerType?: unknown } })._def
				if (def && "innerType" in def) {
					inner = def.innerType
				}
			}
			depth++
		} else {
			break
		}
	}

	return inner
}

export function getZodObjectShape(schema: unknown): z.ZodRawShape | undefined {
	const unwrapped = unwrapZodWrappers(schema)
	if (isZodObject(unwrapped)) {
		return unwrapped.shape
	}
	return undefined
}

export function isZodArray(schema: unknown): schema is z.ZodArray<any> {
	return (
		typeof schema === "object" &&
		schema !== null &&
		"type" in schema &&
		(schema as { type: string }).type === "array"
	)
}

export function getZodArrayElement(schema: unknown): unknown {
	if (!isZodArray(schema)) {
		return undefined
	}
	const unwrapped = unwrapZodWrappers(schema)
	if (typeof unwrapped === "object" && unwrapped !== null && "element" in unwrapped) {
		return (unwrapped as { element: unknown }).element
	}
	return undefined
}

export function introspectSchema<T extends z.ZodRawShape>(
	schema: z.ZodObject<T>,
): ZodFieldInfo[] {
	const fields: ZodFieldInfo[] = []
	const shape = schema.shape

	for (const [_name, fieldSchema] of Object.entries(shape)) {
		const info = introspectZodField(fieldSchema)
		fields.push(info)
	}

	return fields
}
