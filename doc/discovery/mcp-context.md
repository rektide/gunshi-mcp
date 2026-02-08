# MCP Context Reference

This document provides a comprehensive reference for the rich context and types available in the Model Context Protocol (MCP) that can serve as the foundation for our system.

**Source:** [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)

---

## Table of Contents

- [RequestHandlerExtra](#requesthandlerextra)
- [ToolAnnotations](#toolannotations)
- [ToolCallback](#toolcallback)
- [CallToolResult](#calltoolresult)
- [ContentBlock Types](#contentblock-types)

---

## RequestHandlerExtra

`RequestHandlerExtra` is passed to all tool handlers and provides rich request context, lifecycle management, and bidirectional communication capabilities.

**Source:** [`packages/core/src/shared/protocol.ts#L241`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/shared/protocol.ts#L241)

### Type Definition

```typescript
export type RequestHandlerExtra<
  SendRequestT extends Request,
  SendNotificationT extends Notification
> = {
  signal: AbortSignal
  authInfo?: AuthInfo
  sessionId?: string
  requestId: RequestId
  _meta?: RequestMeta
  taskId?: string
  taskStore?: RequestTaskStore
  taskRequestedTtl?: number | null
  requestInfo?: RequestInfo
  sendNotification: (notification: SendNotificationT) => Promise<void>
  sendRequest: <U extends AnySchema>(
    request: SendRequestT,
    resultSchema: U,
    options?: TaskRequestOptions
  ) => Promise<SchemaOutput<U>>
}
```

### Fields

#### Lifecycle & Cancellation

| Field    | Type          | Description                                                                                                                               |
| -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `signal` | `AbortSignal` | Communicates if the request was cancelled from the sender's side. Handlers should check this signal periodically to respect cancellation. |

**Source:** [`packages/core/src/shared/protocol.ts#L244-L248`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/shared/protocol.ts#L244-L248)

---

#### Authentication & Security

| Field      | Type        | Description                                                                             |
| ---------- | ----------- | --------------------------------------------------------------------------------------- |
| `authInfo` | `AuthInfo?` | Information about a validated access token. Contains `token`, `clientId`, and `scopes`. |

**Source:** [`packages/core/src/shared/protocol.ts#L250-L253`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/shared/protocol.ts#L250-L253)

**AuthInfo Source:** [`packages/core/src/types/types.ts`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/types/types.ts)

```typescript
interface AuthInfo {
  token: string
  clientId: string
  scopes: string[]
}
```

---

#### Session & Request Identification

| Field       | Type        | Description                                                                      |
| ----------- | ----------- | -------------------------------------------------------------------------------- |
| `sessionId` | `string?`   | The session ID from the transport. Used for multi-tenant or stateful transports. |
| `requestId` | `RequestId` | The JSON-RPC ID of the request being handled. Useful for tracking and logging.   |

**Source:** [`packages/core/src/shared/protocol.ts#L255-L260`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/shared/protocol.ts#L255-L260)

**RequestId Type:** `string \| number` (JSON-RPC request identifier)

---

#### Request Metadata

| Field   | Type           | Description                                                                           |
| ------- | -------------- | ------------------------------------------------------------------------------------- |
| `_meta` | `RequestMeta?` | Metadata from the original request, including progress tokens and task relationships. |

**Source:** [`packages/core/src/shared/protocol.ts#L262-L264`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/shared/protocol.ts#L262-L264)

**RequestMeta Source:** [`packages/core/src/types/types.ts`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/types/types.ts)

```typescript
interface RequestMeta {
  progressToken?: ProgressToken
  [RELATED_TASK_META_KEY]?: { taskId: string }
}
```

---

#### Task Support (Experimental)

| Field              | Type                | Description                                                |
| ------------------ | ------------------- | ---------------------------------------------------------- |
| `taskId`           | `string?`           | The task ID if this is a task-related request.             |
| `taskStore`        | `RequestTaskStore?` | Task store for creating/managing long-running async tasks. |
| `taskRequestedTtl` | `number \| null`    | Task requested time-to-lives, if specified.                |

**Source:** [`packages/core/src/shared/protocol.ts#L266-L272`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/shared/protocol.ts#L266-L272)

**RequestTaskStore Interface:**

```typescript
interface RequestTaskStore {
  createTask(taskParams: CreateTaskOptions): Promise<Task>
  getTask(taskId: string): Promise<Task>
  storeTaskResult(taskId: string, status: 'completed' | 'failed', result: Result): Promise<void>
  getTaskResult(taskId: string): Promise<Result>
  updateTaskStatus(taskId: string, status: Task['status'], statusMessage?: string): Promise<void>
  listTasks(cursor?: string): Promise<{ tasks: Task[]; nextCursor?: string }>
}
```

**Source:** [`packages/core/src/shared/protocol.ts`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/shared/protocol.ts)

---

#### HTTP-Specific Context

| Field         | Type           | Description                                        |
| ------------- | -------------- | -------------------------------------------------- |
| `requestInfo` | `RequestInfo?` | The original HTTP request for SSE/HTTP transports. |

**Source:** [`packages/core/src/shared/protocol.ts#L274-L276`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/shared/protocol.ts#L274-L276)

**RequestInfo Source:** [`packages/core/src/types/types.ts`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/types/types.ts)

```typescript
interface RequestInfo {
  headers: Headers
}
```

---

#### Communication Methods

| Method             | Signature                                                                                                                 | Description                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `sendNotification` | `(notification: SendNotificationT) => Promise<void>`                                                                      | Sends a notification relating to the current request. Used by transports to associate related messages. |
| `sendRequest`      | `<U extends AnySchema>(request: SendRequestT, resultSchema: U, options?: TaskRequestOptions) => Promise<SchemaOutput<U>>` | Sends a request relating to the current request. Used by transports to associate related messages.      |

**Source:** [`packages/core/src/shared/protocol.ts#L278-L288`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/shared/protocol.ts#L278-L288)

---

## ToolAnnotations

`ToolAnnotations` provides optional hints about tool behavior to help clients make better decisions about tool usage. All properties are hints and not guaranteed to be accurate.

**Source:** [`packages/core/src/types/types.ts#L1321`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/types/types.ts#L1321)

### Type Definition

```typescript
export const ToolAnnotationsSchema = z.object({
  title: z.string().optional(),
  readOnlyHint: z.boolean().optional(),
  destructiveHint: z.boolean().optional(),
  idempotentHint: z.boolean().optional(),
  openWorldHint: z.boolean().optional()
})
```

### Fields

| Field             | Type       | Default | Description                                                                                                                                                             |
| ----------------- | ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`           | `string?`  | -       | A human-readable title for the tool.                                                                                                                                    |
| `readOnlyHint`    | `boolean?` | `false` | If `true`, the tool does not modify its environment.                                                                                                                    |
| `destructiveHint` | `boolean?` | `true`  | If `true`, the tool may perform destructive updates. Only meaningful when `readOnlyHint == false`.                                                                      |
| `idempotentHint`  | `boolean?` | `false` | If `true`, calling the tool repeatedly with the same arguments has no additional effect. Only meaningful when `readOnlyHint == false`.                                  |
| `openWorldHint`   | `boolean?` | `true`  | If `true`, this tool may interact with an "open world" of external entities. If `false`, the tool's domain of interaction is closed (e.g., web search vs. memory tool). |

**Source:** [`packages/core/src/types/types.ts#L1319-L1347`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/types/types.ts#L1319-L1347)

### Important Note

> All properties in ToolAnnotations are **hints**. They are not guaranteed to provide a faithful description of tool behavior. Clients should never make tool use decisions based on ToolAnnotations received from untrusted servers.

---

## ToolCallback

`ToolCallback` is the function signature for tool handlers registered with `McpServer`. It receives validated arguments and rich request context.

**Source:** [`packages/server/src/server/mcp.ts#L1046`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/server/src/server/mcp.ts#L1046)

### Type Definition

```typescript
export type ToolCallback<Args extends undefined | ZodRawShapeCompat | AnySchema = undefined> = BaseToolCallback<
  CallToolResult,
  RequestHandlerExtra<ServerRequest, ServerNotification>,
  Args
>

type BaseToolCallback<
  SendResultT extends Result,
  Extra extends RequestHandlerExtra<ServerRequest, ServerNotification>,
  Args extends undefined | ZodRawShapeCompat | AnySchema
> = Args extends ZodRawShapeCompat
  ? (args: ShapeOutput<Args>, extra: Extra) => SendResultT | Promise<SendResultT>
  : Args extends AnySchema
    ? (args: SchemaOutput<Args>, extra: Extra) => SendResultT | Promise<SendResultT>
    : (extra: Extra) => SendResultT | Promise<SendResultT>
```

**Source:** [`packages/server/src/server/mcp.ts#L1026-L1050`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/server/src/server/mcp.ts#L1026-L1050)

### Parameters

#### `args`

The first parameter is the validated input arguments.

- **Type:** `ShapeOutput<Args> | SchemaOutput<Args>` (or omitted if no input schema)
- **Description:** Arguments validated against the tool's `inputSchema`. The exact type depends on how the schema was registered:
  - **ZodRawShapeCompat:** `{ name: z.string() }` → `args: { name: string }`
  - **AnySchema:** `z.object({ name: z.string() })` → `args: { name: string }`
  - **No schema:** Handler receives no `args` parameter

#### `extra`

The second parameter is the request context (see [RequestHandlerExtra](#requesthandlerextra)).

- **Type:** `RequestHandlerExtra<ServerRequest, ServerNotification>`
- **Description:** Rich context about the request including:
  - `signal` for cancellation
  - `requestId` for tracking
  - `authInfo` for authentication
  - `taskStore` for async tasks
  - `sendNotification`/`sendRequest` for communication

### Return Value

- **Type:** `CallToolResult | Promise<CallToolResult>`
- **Description:** The result of the tool execution (see [CallToolResult](#calltoolresult))

---

## CallToolResult

`CallToolResult` is the response structure returned by tool handlers. It can contain unstructured content blocks, structured data, or error information.

**Source:** [`packages/core/src/types/types.ts#L1447`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/types/types.ts#L1447)

### Type Definition

```typescript
export const CallToolResultSchema = ResultSchema.extend({
  content: z.array(ContentBlockSchema).default([]),
  structuredContent: z.record(z.string(), z.unknown()).optional(),
  isError: z.boolean().optional()
})
```

### Fields

| Field               | Type                       | Required            | Description                                                                                           |
| ------------------- | -------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `content`           | `ContentBlock[]`           | Yes (default: `[]`) | A list of content blocks representing the result. Required if tool does not define an `outputSchema`. |
| `structuredContent` | `Record<string, unknown>?` | Conditional         | Structured output matching the tool's `outputSchema`. Required if tool defines an `outputSchema`.     |
| `isError`           | `boolean?`                 | No                  | Whether the tool call ended in an error. Defaults to `false`.                                         |

**Source:** [`packages/core/src/types/types.ts#L1447-L1472`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/types/types.ts#L1447-L1472)

### Usage Guidelines

#### Without `outputSchema`

When a tool does not define an `outputSchema`, return `content`:

```typescript
{
  content: [
    { type: "text", text: "Operation completed successfully" }
  ]
}
```

#### With `outputSchema`

When a tool defines an `outputSchema`, return `structuredContent`:

```typescript
{
  structuredContent: {
    userId: 123,
    name: "John Doe",
    email: "john@example.com"
  }
}
```

#### Error Handling

Tool errors should be reported within the result object with `isError: true`, **not** as MCP protocol-level errors. This allows the LLM to see the error and self-correct.

```typescript
{
  content: [
    { type: "text", text: "User not found" }
  ],
  isError: true
}
```

**Exception:** Errors in finding the tool, unsupported tool calls, or other exceptional conditions should be reported as MCP error responses.

---

## ContentBlock Types

`ContentBlock` represents various content types that can be used in prompts and tool results.

**Source:** [`packages/core/src/types/types.ts#L1275`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/types/types.ts#L1275)

### Type Definition

```typescript
export const ContentBlockSchema = z.union([
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ResourceLinkSchema,
  EmbeddedResourceSchema
])
```

### TextContent

**Source:** [`packages/core/src/types/types.ts#L1147`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/types/types.ts#L1147)

```typescript
{
  type: "text"
  text: string
  annotations?: Annotations
}
```

### ImageContent

**Source:** [`packages/core/src/types/types.ts#L1169`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/types/types.ts#L1169)

```typescript
{
  type: "image"
  data: string  // base64-encoded
  mimeType: string
}
```

### AudioContent

**Source:** [`packages/core/src/types/types.ts#L1195`](https://github.com/modelcontextprotocol/typescript-sdk/blob/00249ce86dac558fb1089aea46d4d6d14e9a56c6/packages/core/src/types/types.ts#L1195)

```typescript
{
  type: "audio"
  data: string  // base64-encoded
  mimeType: string
}
```

### ResourceLink

Links to an external resource by URI.

```typescript
{
  type: "resource"
  uri: string
}
```

### EmbeddedResource

Embeds resource content directly.

```typescript
{
  type: "resource"
  uri: string
  mimeType?: string
  text?: string
  blob?: string  // base64-encoded
}
```

---

## Summary: MCP as System Foundation

The Model Context Protocol provides a rich, well-typed foundation for our tool system:

### Key Advantages

1. **Rich Request Context** - `RequestHandlerExtra` provides:
   - Cancellation support via `signal`
   - Authentication via `authInfo`
   - Request tracking via `requestId`
   - Async task management via `taskStore`
   - Bidirectional communication via `sendNotification`/`sendRequest`

2. **Structured Tool Metadata** - `ToolAnnotations` provide hints about:
   - Whether tools modify data (`readOnlyHint`)
   - Whether tools are destructive (`destructiveHint`)
   - Whether tools are idempotent (`idempotentHint`)
   - Open vs closed world interaction (`openWorldHint`)

3. **Flexible Result Types** - `CallToolResult` supports:
   - Unstructured content (text, images, audio, resources)
   - Structured data via `outputSchema`
   - Error reporting via `isError`

4. **Type Safety** - All types are strongly typed with Zod schemas, ensuring validation at runtime.

### Integration Strategy

Our `GunshiTool` system can leverage MCP types by:

1. Using MCP-compatible handler signatures
2. Mapping `ToolContext.extensions` to `RequestHandlerExtra`
3. Supporting MCP result formats
4. Exposing `ToolAnnotations` for tool metadata
