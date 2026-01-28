# Tool Definition Follow-up Review

Assessment of the Zod-first refactor and JSON Schema improvements.

## What Was Fixed ✅

### Priority 1: Zod-First Type Model

| Before                                | After                                 | Status   |
| ------------------------------------- | ------------------------------------- | -------- |
| `inputSchema: TSchema` (raw record)   | `input: z.ZodObject<Shape>`           | ✅ Fixed |
| Handler args typed as schema object   | `args: ZodInput<Shape>` via `z.infer` | ✅ Fixed |
| `as Record<string, unknown>` required | No casts needed                       | ✅ Fixed |
| `assertToolInput()` unsafe cast       | Removed, using `tool.input.parse()`   | ✅ Fixed |

The core type model is now correct. Handler args are properly inferred:

```ts
// test proves inference works (basic.test.ts#L191-L215)
handler: async (args) => {
  const _messageCheck: string = args.message  // ✅ Inferred
  const _countCheck: number = args.count      // ✅ Inferred
}
```

### Priority 2: JSON Schema for MCP

| Before                            | After                           | Status   |
| --------------------------------- | ------------------------------- | -------- |
| `inputSchema as any` (Zod object) | `zodToJsonSchema(tool.input)`   | ✅ Fixed |
| No JSON Schema conversion         | `zodToJsonSchema()` implemented | ✅ Fixed |
| No tests for schema output        | Tests for all basic types       | ✅ Fixed |

---

## Remaining Issues

### 1. Zod Introspection Still Uses Private APIs

**Location**: [zod-to-gunshi.ts#L39](file:///home/rektide/src/gunshi-mcp/src/zod-to-gunshi.ts#L39)

The code now checks `.type` property (better) but still accesses `._def.defaultValue`:

```ts
const def = (inner as { _def?: { defaultValue: unknown } })._def
if (def && "defaultValue" in def) {
  if (typeof def.defaultValue === "function") {
    defaultValue = (def.defaultValue as () => unknown)()
  }
}
```

**Risk**: `_def` is Zod internal API, may break on version updates.

**Recommendation**:

- Pin Zod version range in peerDependencies
- Or use `zod-to-json-schema` library for the JSON Schema path (more battle-tested)
- Add version detection tests that fail if Zod internals change

### 2. Array Item Types Not Introspected

**Location**: [zod-to-gunshi.ts#L216](file:///home/rektide/src/gunshi-mcp/src/zod-to-gunshi.ts#L216)

```ts
...(info.type === "array" && { items: { type: "string" } }),
```

Always assumes `string[]`. An array of numbers or objects will produce incorrect schema.

**Recommendation**: Recursively introspect array element type:

```ts
if (info.type === "array") {
  const elementSchema = getArrayElementSchema(field)
  property.items = introspectToJsonSchema(elementSchema)
}
```

### 3. Nested Objects Not Supported

**Location**: [zod-to-gunshi.ts#L107-L108](file:///home/rektide/src/gunshi-mcp/src/zod-to-gunshi.ts#L107-L108)

```ts
case "object":
  return { type: "object", required, default: defaultValue, description }
```

Nested `z.object()` produces `{ type: "object" }` with no `properties`.

**Recommendation**: Recursively call `zodToJsonSchema` for nested objects:

```ts
case "object":
  const nestedSchema = zodToJsonSchema(inner as z.ZodObject<any>)
  return { ...nestedSchema, required, default: defaultValue, description }
```

### 4. `as any` Still Present in MCP Registration

**Location**: [mcp-plugin.ts#L110-L111](file:///home/rektide/src/gunshi-mcp/src/mcp-plugin.ts#L110-L111)

```ts
inputSchema: zodToJsonSchema(tool.input) as any,
outputSchema: outputSchema as any,
```

The `as any` casts remain. This is less critical now since `zodToJsonSchema` returns valid JSON Schema, but it obscures type mismatches.

**Recommendation**: Type the return of `zodToJsonSchema` to match MCP SDK's expected type:

```ts
import type { ToolInputSchema } from "@modelcontextprotocol/sdk/..."

export function zodToJsonSchema<const Shape extends ZodShape>(
  schema: z.ZodObject<Shape>,
): ToolInputSchema { ... }
```

### 5. Output Schema Conversion is Fragile

**Location**: [mcp-plugin.ts#L95-L103](file:///home/rektide/src/gunshi-mcp/src/mcp-plugin.ts#L95-L103)

```ts
const outputSchema = tool.output
  ? (function tryConvertToJSONSchema(schema: any): object | undefined {
      try {
        return zodToJsonSchema(schema as any)
      } catch {
        return undefined
      }
    })(tool.output)
  : undefined
```

Issues:

- `zodToJsonSchema` expects `z.ZodObject`, but `tool.output` is `z.ZodTypeAny` (could be string, array, etc.)
- Silent `catch` swallows all errors
- IIFE pattern is unusual

**Recommendation**: Create `zodTypeToJsonSchema` that handles non-object types:

```ts
export function zodTypeToJsonSchema(schema: z.ZodTypeAny): object {
  if (schema instanceof z.ZodObject) {
    return zodToJsonSchema(schema)
  }
  // Handle primitives, arrays, unions, etc.
  return introspectZodFieldToJsonSchema(schema)
}
```

### 6. No Error Handling for `tool.input.parse()`

**Location**: [mcp-plugin.ts#L64](file:///home/rektide/src/gunshi-mcp/src/mcp-plugin.ts#L64), [mcp-plugin.ts#L117](file:///home/rektide/src/gunshi-mcp/src/mcp-plugin.ts#L117)

```ts
const parsed = tool.input.parse(cmdCtx.values)  // May throw ZodError
const result = await tool.handler(parsed, toolCtx)
```

If parsing fails, ZodError propagates raw—no user-friendly CLI output or MCP error response.

**Recommendation**: Wrap with error handling:

```ts
// CLI path
let parsed
try {
  parsed = tool.input.parse(cmdCtx.values)
} catch (err) {
  if (err instanceof z.ZodError) {
    console.error(formatZodError(err))
    process.exitCode = 1
    return
  }
  throw err
}

// MCP path
try {
  parsed = tool.input.parse(inputArgs)
} catch (err) {
  if (err instanceof z.ZodError) {
    return {
      type: "tool_result",
      toolUseId: tool.name,
      isError: true,
      content: [{ type: "text", text: formatZodError(err) }],
    }
  }
  throw err
}
```

### 7. `ToolDefinition<any, any>[]` Erases Generics

**Location**: [mcp-plugin.ts#L13](file:///home/rektide/src/gunshi-mcp/src/mcp-plugin.ts#L13), [mcp-plugin.ts#L20](file:///home/rektide/src/gunshi-mcp/src/mcp-plugin.ts#L20)

```ts
tools?: ToolDefinition<any, any>[]
const toolDefinitions: ToolDefinition<any, any>[] = []
```

All tool type information is erased at plugin creation.

**Recommendation**: Keep generic through plugin creation:

```ts
export function createMcpPlugin<
  const TTools extends readonly ToolDefinition<any, any>[]
>(options: { tools?: TTools; name?: string; version?: string } = {}) { ... }
```

Even if not used internally, this preserves type info for downstream tooling.

### 8. Magic `format` Parameter Persists

**Location**: [mcp-plugin.ts#L66](file:///home/rektide/src/gunshi-mcp/src/mcp-plugin.ts#L66)

```ts
const format = cmdCtx.values.format as "text" | "json" | undefined
```

Still undocumented implicit behavior.

**Recommendation**: Either:

- Document as a global CLI flag
- Add to tool schema explicitly where needed
- Remove if not actually used

### 9. `ZodShape` / `ZodInput` Not Exported

**Location**: [index.ts](file:///home/rektide/src/gunshi-mcp/src/index.ts)

These utility types aren't exported, limiting downstream typing:

```ts
// types.ts defines them
export type ZodShape = z.ZodRawShape
export type ZodInput<Shape extends ZodShape> = z.infer<z.ZodObject<Shape>>

// index.ts doesn't export them
```

**Recommendation**: Export for library consumers who want to type their own extensions.

---

## Summary

| Area                            | Status     | Notes                                      |
| ------------------------------- | ---------- | ------------------------------------------ |
| Zod-first type model            | ✅ Done    | Core fix complete                          |
| Handler arg inference           | ✅ Done    | Working correctly                          |
| No more `as Record<...>` casts  | ✅ Done    | Clean API                                  |
| `tool.input.parse()` validation | ✅ Done    | Both paths validate                        |
| JSON Schema conversion          | ⚠️ Partial | Basic types work, nested/arrays incomplete |
| Error handling                  | ❌ Missing | ZodError not caught/formatted              |
| Private API usage               | ⚠️ Risk    | `_def` access still present                |
| Output schema handling          | ⚠️ Fragile | Only works for ZodObject                   |
| Type exports                    | ❌ Missing | `ZodShape`, `ZodInput` not exported        |

## Priority Order for Remaining Work

1. **Error handling** for parse failures (user-visible bug)
2. **Export utility types** (quick win)
3. **Nested object support** in JSON Schema (correctness)
4. **Array element type introspection** (correctness)
5. **Output schema handling** (robustness)
6. **Pin Zod version / add version tests** (stability)
