# CLI Arguments Review

Assessment of the `cli-args/` module refactor for nested object flattening and CLI argument generation.

## Architecture Overview

The new `src/cli-args/` module provides a clean separation of concerns:

```
cli-args/
├── index.ts       # Main entry point, orchestrates conversion
├── types.ts       # Shared type definitions
├── introspect.ts  # Zod schema introspection
├── flatten.ts     # Nested object → flat keys
├── reconstruct.ts # Flat keys → nested values
├── collision.ts   # Key collision detection
├── arrays.ts      # Array handling strategies
└── overrides.ts   # User override application
```

This is a solid modular design. Each file has a single responsibility.

## What's Working ✅

| Feature                      | Status     | Location             |
| ---------------------------- | ---------- | -------------------- |
| Basic type conversion        | ✅ Working | `introspect.ts`      |
| Nested object flattening     | ✅ Working | `flatten.ts`         |
| Collision detection          | ✅ Working | `collision.ts`       |
| Depth limiting               | ✅ Working | `flatten.ts#L37-L38` |
| Value reconstruction         | ✅ Working | `reconstruct.ts`     |
| Test coverage for flattening | ✅ Good    | `cli-args.test.ts`   |

---

## Issues Found

### 1. ❌ `reconstructNested` Not Used in CLI Path

**Severity**: Critical

The reconstruction function exists but isn't called in `mcp-plugin.ts`:

```ts
// mcp-plugin.ts#L64
const parsed = tool.input.parse(cmdCtx.values)
```

`cmdCtx.values` contains flat keys like `{ "config-timeout": 30 }` but `tool.input` expects nested structure `{ config: { timeout: 30 } }`. This will fail Zod validation for any nested schema.

**Fix required**:

```ts
import { reconstructNestedValues } from "./zod-to-gunshi.js"

// In CLI run handler:
const nestedValues = reconstructNestedValues(cmdCtx.values, separator)
const parsed = tool.input.parse(nestedValues)
```

### 2. ❌ CLI Options Not Exposed in Tool Definition

**Severity**: High

`ToolDefinition.cli` only has `args` override:

```ts
// types.ts#L44-L46
cli?: {
  args?: Partial<Record<keyof Shape, Partial<GunshiArg>>>
}
```

But `zodSchemaToGunshiArgs` accepts `separator`, `maxDepth`, `arrayHandling`. These can't be configured per-tool.

**Fix required**:

```ts
cli?: {
  args?: Partial<Record<string, Partial<GunshiArg>>>  // Note: string, not keyof Shape
  separator?: string
  maxDepth?: number
  arrayHandling?: "json" | "repeated"
}
```

### 3. ❌ Override Keys Don't Match Flat Keys

**Severity**: High

Override type is `Record<keyof Shape, ...>` but flat keys are hyphenated:

```ts
// types.ts#L45
args?: Partial<Record<keyof Shape, Partial<GunshiArg>>>
```

For schema `{ config: { timeout: z.number() } }`:

- Flat key is `"config-timeout"`
- `keyof Shape` is `"config"`

User can't override `config-timeout` with current typing.

**Fix required**:

```ts
args?: Partial<Record<string, Partial<GunshiArg>>>
```

And update override lookup in `index.ts#L22`:

```ts
const override = overrides?.[flatKey]  // Already doing this correctly!
```

The code is correct but the type is wrong.

### 4. ⚠️ Array Element Type Not Introspected for JSON Schema

**Severity**: Medium

```ts
// zod-to-gunshi.ts#L67
...(info.type === "array" && { items: { type: "string" } }),
```

Always assumes `string[]`. Should use `arrays.ts` logic to detect element type.

### 5. ⚠️ `lookupField` Uses Private `_def.shape`

**Severity**: Medium

```ts
// index.ts#L52
const innerSchema = (field as { _def?: { shape: z.ZodRawShape } })._def?.shape
```

Same pattern in `flatten.ts#L40`. This is fragile across Zod versions.

**Recommendation**: Extract to a single helper in `introspect.ts`:

```ts
export function unwrapZodObject(field: z.ZodObject<any>): z.ZodRawShape | undefined {
  return field.shape  // Use public API when available
}
```

### 6. ⚠️ `isZodArray` Check is Inconsistent

**Severity**: Medium

```ts
// arrays.ts#L34-L42
function isZodArray(schema: unknown): schema is z.ZodArray<any> {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "_def" in schema &&
    typeof (schema as any)._def === "object" &&
    "type" in (schema as any)._def &&
    (schema as any)._def.type === "ZodArray"
  )
}
```

But `introspect.ts` checks `schema.type === "array"`. These may diverge.

**Recommendation**: Standardize on one approach. The `schema.type` check in introspect is cleaner if it works for all Zod versions.

### 7. ⚠️ Separator Not Passed Through Plugin

**Severity**: Medium

`mcp-plugin.ts` calls `zodSchemaToGunshiArgs(tool.input, tool.cli?.args)` without options:

```ts
// mcp-plugin.ts#L46
const convertedArgs = zodSchemaToGunshiArgs(tool.input, tool.cli?.args)
```

Default separator `-` is used, but there's no way to configure it per-tool.

### 8. ⚠️ No Tests for Reconstruction

**Severity**: Medium

`cli-args.test.ts` tests flattening but not the round-trip:

```ts
// Missing test:
it("should reconstruct nested values from flat keys", () => {
  const flat = { "config-timeout": 30, "config-retries": 3, name: "test" }
  const nested = reconstructNested(flat, "-")
  expect(nested).toEqual({
    config: { timeout: 30, retries: 3 },
    name: "test",
  })
})
```

### 9. ⚠️ No Integration Test for Nested CLI → Handler

**Severity**: Medium

No test verifies the full flow:

1. Define tool with nested schema
2. Generate CLI args (flattened)
3. Simulate CLI input with flat values
4. Reconstruct to nested
5. Verify handler receives correct nested structure

### 10. ⚠️ Optional Parent Propagation Not Tracked

**Severity**: Low

`flatten.ts` tracks `parentOptional` but doesn't use it in the output:

```ts
// flatten.ts#L34
const isOptional = parentOptional || !info.required
```

But `info.required` is what gets stored, not the computed `isOptional`.

### 11. ⚠️ Collision Path Format Inconsistent

**Severity**: Low

```ts
// flatten.ts#L48-L49
const existing = context.collisions.get(flatKey) || [flatKey]
existing.push(`${currentPrefix}.${key}`)
```

First entry is flat key (`foo-bar`), second is dot path (`foo.bar`). Inconsistent.

---

## Summary Table

| Issue                             | Severity | Type         | Effort |
| --------------------------------- | -------- | ------------ | ------ |
| `reconstructNested` not called    | Critical | Bug          | S      |
| CLI options not in ToolDefinition | High     | Missing      | S      |
| Override key types wrong          | High     | Type Bug     | S      |
| Array element type hardcoded      | Medium   | Incomplete   | M      |
| Private `_def.shape` usage        | Medium   | Fragile      | M      |
| `isZodArray` inconsistent         | Medium   | Inconsistent | S      |
| Separator not configurable        | Medium   | Missing      | S      |
| No reconstruction tests           | Medium   | Testing      | S      |
| No integration tests              | Medium   | Testing      | M      |
| Optional propagation unused       | Low      | Dead code    | S      |
| Collision path format             | Low      | Polish       | S      |

---

## Recommended Fix Order

### Phase 1: Critical Bugs (blocks functionality)

1. **Call `reconstructNested` in CLI path** - Without this, nested schemas break at runtime
2. **Fix override type to `Record<string, ...>`** - Enables overriding flattened keys

### Phase 2: Complete the API

3. **Expand `cli` in ToolDefinition** - Add `separator`, `maxDepth`, `arrayHandling`
4. **Pass CLI options through plugin** - Wire up the configuration

### Phase 3: Robustness

5. **Standardize Zod introspection** - Single helper for `_def` access
6. **Add reconstruction tests** - Verify round-trip
7. **Add integration test** - Full CLI → handler flow

### Phase 4: Polish

8. **Fix array element introspection** - For JSON Schema correctness
9. **Clean up optional propagation** - Use or remove
10. **Normalize collision error format** - Consistent paths

---

## Code Snippets for Critical Fixes

### Fix 1: Call reconstructNested

```ts
// mcp-plugin.ts - CLI run handler
run: async (cmdCtx) => {
  const mcpExtension = cmdCtx.extensions?.[MCP_NEW_PLUGIN_ID]
  const toolCtx = buildToolContext(mcpExtension as Record<string, unknown>)

  const separator = tool.cli?.separator ?? "-"
  const nestedValues = reconstructNestedValues(cmdCtx.values, separator)
  const parsed = tool.input.parse(nestedValues)

  const result = await tool.handler(parsed, toolCtx)
  const format = cmdCtx.values.format as "text" | "json" | undefined
  console.log(formatResult(result, format))
},
```

### Fix 2: Expand ToolDefinition.cli

```ts
// types.ts
export interface CliConfig {
  args?: Partial<Record<string, Partial<GunshiArg>>>
  separator?: string
  maxDepth?: number
  arrayHandling?: "json" | "repeated"
}

export interface ToolDefinition<Shape extends ZodShape = ZodShape, TExtensions = {}> {
  // ...
  cli?: CliConfig
  // ...
}
```

### Fix 3: Wire options through plugin

```ts
// mcp-plugin.ts
const convertedArgs = zodSchemaToGunshiArgs(tool.input, tool.cli?.args, {
  separator: tool.cli?.separator,
  maxDepth: tool.cli?.maxDepth,
  arrayHandling: tool.cli?.arrayHandling,
})
```
