import type { ToolContext, McpToolExtra } from "./types.ts"

export function buildToolContext<E>(extensions: E, mcpExtra?: McpToolExtra): ToolContext<E> {
	return {
		extensions,
		log: {
			info: (msg: string, ...args: unknown[]) => console.log(msg, ...args),
			warn: (msg: string, ...args: unknown[]) => console.warn(msg, ...args),
			error: (msg: string, ...args: unknown[]) => console.error(msg, ...args),
			debug: (msg: string, ...args: unknown[]) => console.debug(msg, ...args),
			trace: (msg: string, ...args: unknown[]) => console.trace(msg, ...args),
			fatal: (msg: string, ...args: unknown[]) => console.error(msg, ...args),
		},
		meta: {
			requestId: mcpExtra?.requestId,
		},
	}
}
