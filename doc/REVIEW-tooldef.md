# Tool Definition System Review

This document assesses the tool definition typing and developer experience in gunshi-mcp.

## Executive Summary

The current tool definition system has **critical type safety issues** where `inputSchema` conflates runtime Zod schema objects with parsed input types. This forces developers to use unsafe casts and prevents TypeScript from inferring handler argument types. Additionally, MCP registration receives Zod schemas cast to `any` instead of proper JSON Schema, which is a runtime bug.

## Type Safety Issues

| Issue                                                          | Location                  | Severity                   |
| -------------------------------------------------------------- | ------------------------- | -------------------------- |
| `TSchema` conflates runtime schema with parsed type            | `types.ts#L32-L47`        | **Critical**               |
| Handler args typed as schema object, not inferred values       | `types.ts#L46`            | Critical                   |
| `as Record<string, unknown>` required in every tool def        | All tool definitions      | High                       |
| MCP receives `inputSchema as any` (not JSON Schema)            | `mcp-plugin.ts#L101-L102` | **Critical (runtime bug)** |
| `assertToolInput` is unsafe cast masquerading as validation    | `types.ts#L80-L83`        | High                       |
| `McpNewPluginOptions.tools?: ToolDefinition[]` erases generics | `mcp-plugin.ts#L14`       | Medium                     |

### Core Problem: Schema vs Parsed Type Conflation

The `ToolDefinition` interface uses `TSchema` for both:

- The runtime schema object passed around (`{ message: z.string() }`)
- The handler's parsed input type (`{ message: string }`)

These are fundamentally different types:

```ts
// Current: TSchema is both the schema AND the handler args (wrong)
interface ToolDefinition<TSchema extends Record<string, unknown>> {
  inputSchema: TSchema
  handler: (args: TSchema, ctx: ToolContext) => Promise<ToolResult>
  //              ^^^^^^^ This receives the Zod schema, not parsed values!
}
```

### Missing Validation

- **CLI path**: `cmdCtx.values` → `assertToolInput()` cast → handler (no actual validation)
- **MCP path**: `inputArgs: any` → handler directly (no validation at all)

The `assertToolInput()` function claims safety via comments but performs an unchecked cast:

```ts
export function assertToolInput<TSchema>(values: Record<string, unknown>): TSchema {
  return values as TSchema  // Unsafe cast, no runtime check
}
```

### MCP Schema Bug

MCP expects JSON Schema, but receives Zod schemas cast to `any`:

```ts
server?.registerTool(tool.name, {
  inputSchema: tool.inputSchema as any,   // Zod schema, not JSON Schema!
  outputSchema: tool.outputSchema as any,
}, ...)
```

This likely causes MCP clients to receive invalid schema metadata.

## Developer Experience Issues

### 1. Required Boilerplate Cast

Every tool definition requires `as Record<string, unknown>`:

```ts
const testTool = defineTool()({
  name: "test-tool",
  inputSchema: {
    message: z.string(),
  } as Record<string, unknown>,  // Required everywhere
  handler: async (args) => { ... }
})
```

This is a red flag indicating the type system isn't working correctly.

### 2. No IntelliSense on Handler Args

Because `TSchema` is the schema object type, developers cannot discover available properties via IntelliSense. They must manually cross-reference the schema.

### 3. Magic `format` Parameter

In `mcp-plugin.ts#L67`:

```ts
const format = cmdCtx.values.format as "text" | "json" | undefined
```

This parameter is used but never defined in any schema—it's implicit magic that developers won't discover.

### 4. Fragile Zod Introspection

`zod-to-gunshi.ts` relies on private `_def.typeName` properties:

```ts
if (def.typeName === "ZodOptional") { ... }
if (def.typeName === "ZodDefault") { ... }
```

This may break across Zod versions.

## Recommended Improvements

### Priority 1: Zod-First Type Model

Separate schema type from inferred input type:

```ts
import type { z } from "zod"

export type ZodShape = z.ZodRawShape
export type ZodInput<Shape extends ZodShape> = z.infer<z.ZodObject<Shape>>

export interface ZodToolDefinition<
  Shape extends ZodShape,
  TExtensions = {}
> {
  name: string
  title?: string
  description: string

  input: z.ZodObject<Shape>  // Runtime schema

  output?: z.ZodTypeAny

  cli?: {
    args?: Partial<Record<keyof Shape, Partial<GunshiArg>>>
  }

  handler: (
    args: ZodInput<Shape>,  // Inferred parsed type
    ctx: ToolContext<TExtensions>
  ) => Promise<ToolResult>
}
```

Update `defineTool` to infer `Shape` automatically:

```ts
export function defineTool<TExtensions = {}>() {
  return <const Shape extends z.ZodRawShape>(
    definition: ZodToolDefinition<Shape, TExtensions>
  ) => definition
}
```

### Priority 2: Always Parse/Validate Inputs

Replace `assertToolInput` with actual Zod parsing:

```ts
// CLI path
const parsed = tool.input.parse(cmdCtx.values)
const result = await tool.handler(parsed, toolCtx)

// MCP path
const parsed = tool.input.parse(inputArgs)
const result = await tool.handler(parsed, toolCtx)
```

This provides:

- Actual runtime validation
- Consistent error handling across CLI and MCP
- Coercion via `z.coerce.*` if needed

### Priority 3: Proper JSON Schema for MCP

Options:

1. **Add dependency**: Use `zod-to-json-schema` for reliable conversion
2. **Build minimal converter**: Extend `zod-to-gunshi.ts` to also emit JSON Schema for the subset of Zod types supported

Example minimal converter approach:

```ts
export function zodToJsonSchema(schema: z.ZodObject<any>): object {
  const properties: Record<string, object> = {}
  const required: string[] = []

  for (const [key, field] of Object.entries(schema.shape)) {
    const info = introspectZodField(field)
    properties[key] = {
      type: info.type === "enum" ? "string" : info.type,
      description: info.description,
      ...(info.enumValues && { enum: info.enumValues }),
      ...(info.default !== undefined && { default: info.default }),
    }
    if (info.required) required.push(key)
  }

  return { type: "object", properties, required }
}
```

### Priority 4: Improve `zodSchemaToGunshiArgs` Typing

```ts
export function zodObjectToGunshiArgs<const Shape extends z.ZodRawShape>(
  schema: z.ZodObject<Shape>,
  overrides?: Partial<Record<keyof Shape, Partial<GunshiArg>>>
): Record<keyof Shape, GunshiArg> { ... }
```

Benefits:

- Override keys constrained to schema keys
- Return type properly keyed
- Eliminates downcasts

### Priority 5: Standardize Error Handling

Add error mapping from Zod validation errors to:

- User-friendly CLI output
- MCP tool error responses with `isError: true`

```ts
function handleToolError(error: unknown, tool: ToolDefinition): ToolResult {
  if (error instanceof z.ZodError) {
    return {
      type: "tool_result",
      toolUseId: tool.name,
      isError: true,
      content: [{
        type: "text",
        text: formatZodError(error),
      }],
    }
  }
  // ... other error types
}
```

## Migration Strategy

To avoid breaking changes, support both patterns temporarily:

```ts
// In registration code:
const zodSchema = isZodObject(tool.input)
  ? tool.input
  : z.object(tool.inputSchema as z.ZodRawShape)
```

This allows gradual migration from `inputSchema` record to `input` ZodObject.

## Missing Functionality

Patterns common in similar libraries that are absent here:

| Feature                                       | Status                                  | Priority |
| --------------------------------------------- | --------------------------------------- | -------- |
| Standard error mapping (Zod → CLI/MCP errors) | Missing                                 | High     |
| Output typing / structured output             | Partial (`structuredContent?: unknown`) | Medium   |
| Cancellation/abort support                    | Missing                                 | Low      |
| Shared/global CLI flags                       | Missing                                 | Medium   |
| First-class `format` option                   | Ad-hoc                                  | Medium   |
| Streaming tool outputs                        | Missing                                 | Low      |

## Effort Estimate

| Change                               | Effort     |
| ------------------------------------ | ---------- |
| Zod-first type refactor + validation | M (1-3h)   |
| JSON Schema conversion for MCP       | S-M (1-2h) |
| Full implementation with tests       | L (1-2d)   |

## Conclusion

The current implementation has fundamental type safety issues that require developers to use unsafe casts and prevent TypeScript from providing proper inference. The recommended "Zod-first" approach would:

1. Eliminate boilerplate casts
2. Enable IntelliSense on handler args
3. Provide actual runtime validation
4. Fix the MCP JSON Schema bug
5. Create a single source of truth for schema handling
