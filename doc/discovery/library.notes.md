gunshi-mcp Vision (Expanded)

Core Idea

gunshi-mcp is a toolkit for building tools.

You're building a CLI application. Your application does things - it fetches data, transforms files, deploys infrastructure, manages resources. These capabilities are tools. gunshi-mcp helps you define these tools once and expose them through multiple interfaces: as CLI commands your users type, as MCP tools that AI assistants can invoke, as OpenCode custom tools for agentic workflows.

One definition. Multiple surfaces. No duplication.

---

Longer Elaboration

The Problem

Modern developer tools need to be accessible in multiple ways. A user might invoke your tool from their terminal. An AI coding assistant might invoke the same tool through MCP. An autonomous agent in OpenCode might need that same capability. Today, you'd write the same logic three times with three different APIs, three different schemas, three different ways of handling arguments and producing output.

What gunshi-mcp Provides

gunshi-mcp is a library for people who are making tools - not using them. It's infrastructure for tool authors.

You describe your tool's purpose, its inputs (via Zod schemas), and its behavior (a handler function). gunshi-mcp takes that single definition and makes it available wherever it needs to be:

CLI: Your tool becomes a command with flags, help text, and argument validation - all derived from your schema
MCP Server: Your tool is exposed via the Model Context Protocol, ready for Claude, Cursor, or any MCP client
OpenCode: Your tool integrates with opencode's custom tool system for agentic automation

The key insight is that these are all the same tool. The interface differs, but the capability is identical. gunshi-mcp bridges that gap.

How It Works

gunshi-mcp builds on gunshi, a modern CLI framework with a powerful plugin system. Each capability - discovery, registration, server management, CLI generation, OpenCode integration - is its own gunshi plugin with a focused responsibility.

You compose these plugins to match your needs:

import { cli } from "gunshi"
import {
createDiscoveryPlugin,
createRegistryPlugin,
createServerPlugin,
createCliPlugin
} from "gunshi-mcp"

await cli(args, command, {
plugins: [
createDiscoveryPlugin({ patterns: ["tools/**/*.ts"] }),
createRegistryPlugin({ autoDiscover: true }),
createServerPlugin({ name: "my-app" }),
createCliPlugin(),
],
})

Need MCP but not CLI? Omit the CLI plugin. Need CLI but not MCP? Omit the server plugin. The plugins are independent
