import type { GunshiTool, ZodShape } from "./types.ts"

export function defineTool<TExtensions = {}>() {
	return <const Shape extends ZodShape>(
		definition: GunshiTool<Shape, TExtensions>,
	): GunshiTool<Shape, TExtensions> => definition
}
