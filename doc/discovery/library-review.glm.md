# Library Design Review: GLM vs Kimi Versions

## Executive Summary

Both versions successfully integrate the Schema Plugin architecture from `cli-structure.md` into the main `library.opus.md` design. Both contain all necessary material, but they take different organizational approaches.

**Recommendation:** Use GLM's cohesive structure as the primary document, optionally reference Kimi's detailed breakdown for Schema Plugin internals when needed.

---

## Overall Structure Comparison

| Aspect | GLM | Kimi |
|---------|-------|-------|
| **Length** | 607 lines (38% shorter) | 996 lines (39% longer) |
| **Organization** | Linear single-path flow: Vision → Plugins → Builder → Usage → Appendix | Multi-tiered with Schema Plugin foundation section + Plugin Details + two appendices |
| **Schema Plugin treatment** | Equal peer among 7 plugins in Plugin Inventory | Appears twice: as dedicated foundation section + as Plugin Details #3 |
| **Appendix approach** | Single "Appendix: Design Decision History" with 9 Q&A entries | Two separate appendices: "Alternative CLI Structure Options" + "Design Decisions" (duplicated Q&As across both) |
| **Consumer separation** | CLI/schema/ and cli/values/ integrated into Schema Plugin section | CLI, Server, OpenCode each have explicit `schema/` subdirectory in separate Plugin Details section |

**Overall preference:** GLM's single-path linear narrative is more cohesive and easier to follow. Kimi's multi-tier structure creates potential confusion with Schema Plugin appearing in multiple contexts.

---

## Schema Plugin Integration

### GLM Approach

Schema Plugin is treated as one of **7 equal peers** in the Plugin Architecture:

```typescript
// Plugin Inventory shows 7 plugins:
plugins: [logging, discovery, registry, schema, server, cli, opencode]

// All plugins documented identically:
1. Logging Plugin
2. Discovery Plugin
3. Registry Plugin
4. Schema Plugin  ← Equal status
5. Server Plugin
6. CLI Plugin
7. OpenCode Plugin
```

**Directory structure:** Schema Plugin gets a single section showing its `introspect/`, `flatten/`, `validate/`, `cache/` subdirectories within the context of the full plugin description.

**Flow:** Vision → Plugins (includes Schema) → Builder → Usage → Appendix (Design History)

**Result:** Schema Plugin is naturally integrated as part of the plugin ecosystem.

### Kimi Approach

Schema Plugin gets **dedicated prominence** through two mechanisms:

1. **"Schema Plugin: The Foundation"** (lines 118-309) - A major section emphasizing Schema Plugin's role as shared infrastructure
2. **Plugin Details section #3** (lines 395-422) - Schema Plugin described again with Extension interface and dependencies

**Directory structure:** Shows Schema Plugin's full internal breakdown twice - once in foundation section explaining the architecture, again in Plugin Details explaining the implementation.

**Flow:** Vision → Schema Plugin Foundation → Plugin Details (includes Schema #3) → Builder → Usage → two appendices

**Result:** Schema Plugin appears in two distinct contexts, potentially confusing about whether it's infrastructure or implementation.

**GLM Strength:** Cohesive, treats Schema Plugin as equal peer  
**Kimi Weakness:** Duplicated Schema Plugin presentation in two contexts

---

## CLI Structure Integration

### GLM Approach

CLI-specific transforms are integrated into Schema Plugin section with clear separation:

```
src/schema/              # Schema Plugin - shared Zod analysis
  ├── introspect/
  ├── flatten/
  ├── validate/
  └── cache/
  
src/cli/
  ├── schema/                   # CLI-specific schema transforms
  │   ├── to-gunshi-arg.ts
  │   ├── arrays.ts
  │   └── overrides.ts
  ├── values/                   # Runtime value handling
  │   ├── reconstruct.ts
  │   └── parse.ts
  └── commands.ts
```

**Key separation:** Each consumer (CLI, Server, OpenCode) has its own `schema/` directory within its plugin's section.

**Result:** Consumer-specific pipelines are cleanly separated at the plugin level.

### Kimi Approach

CLI, Server, and OpenCode plugins each get dedicated "Plugin Details" sections with explicit `schema/` subdirectories:

- **CLI Plugin Details** (lines 460-504): Shows `cli/schema/` and `cli/values/` structure
- **Server Plugin Details** (lines 424-468): Shows `server/schema/` structure  
- **OpenCode Plugin Details** (lines 494-527): Shows `opencode/schema/` structure

**Result:** Consumer-specific directories clearly called out within each plugin's detailed section.

**GLM Strength:** Consumer transforms mixed into Schema Plugin section (cleaner but harder to locate)  
**Kimi Strength:** Consumer-specific directories explicitly documented in dedicated sections (easier to find each plugin's schema handling)

---

## Appendix Organization

### GLM Approach

Single appendix: **"Appendix: Design Decision History"**

Contains 10 design decisions with Q&A format:
1. Schema Plugin Granularity
2. Caching Strategy  
3. Flatten Options Ownership
4. Type Handler Extension
5. JSON Schema Generation Location
6. Runtime Value Reconstruction
7. Error Handling
8. Plugin vs Utility
9. Builder Integration
10. Naming: "Schema" vs alternatives

**Result:** Complete, non-redundant narrative of all design choices.

### Kimi Approach

Two separate appendices:

1. **"Appendix: Alternative CLI Structure Options"** (lines 886-987) - Options A, B, C, D with detailed pros/cons
2. **"Appendix: Design Decisions"** (lines 830-996) - 9 Q&As (same content as GLM's appendix, duplicated)

**Result:** Design decisions appear twice across both appendices.

**GLM Strength:** Single appendix, no duplication, cleaner narrative  
**Kimi Strength:** More detailed alternative analysis with pros/cons for each option

---

## Relative Strengths Summary

| Aspect | GLM Strength | Kimi Strength |
|---------|---------------|---------------|
| **Conciseness** | ✅ 38% shorter, focused narrative | ⚠️ 39% longer, more verbose |
| **Flow coherence** | ✅ Single linear path (Vision → Plugins → Builder → Usage → Appendix) | ⚠️ Multi-tier with Schema Plugin foundation insertion |
| **Schema Plugin visibility** | ✅ Treated as equal peer among 7 plugins, integrated naturally | ⚠️ Appears in two contexts (foundation section + Plugin Details #3) |
| **Consumer separation** | ⚠️ Mixed into Schema Plugin section (harder to locate specific plugin's schema handling) | ✅ Each plugin has explicit `schema/` subdirectory in dedicated Plugin Details section |
| **Appendix clarity** | ✅ Single coherent appendix with 10 Q&A entries | ⚠️ Two appendices with duplicated design decisions |
| **Alternative analysis** | ⚠️ None (alternatives moved to appendix with brief mention) | ✅ Detailed pros/cons for each of 4 CLI structure options |
| **Design decision structure** | ✅ Single Q&A format, no duplication | ⚠️ Q&As duplicated across two appendices |

---

## Recommendations

### For Primary Use

1. **Use GLM as the canonical design document**
   - Cohesive linear narrative
   - Schema Plugin naturally integrated
   - Clear progression from vision to implementation
   - Single appendix without duplication

2. **Reference Kimi for Schema Plugin internals** (when needed)
   - Kimi's breakdown of `introspect/`, `flatten/`, `validate/` subdirectories is excellent
   - Detailed file-by-file structure is valuable for implementers
   - Store in `doc/discovery/library.kimi.md` as reference material

### For Implementation

1. **Follow GLM's structure** for the overall architecture
2. **Consult Kimi's Schema Plugin section** for detailed file organization
3. **Use both appendices** as complementary reference material
   - GLM's appendix for decision rationale (Q&A format)
   - Kimi's "Alternative CLI Structure Options" for option analysis (pros/cons)

---

## Conclusion

**GLM version** provides a more cohesive, linear narrative that treats Schema Plugin as a natural equal within the plugin ecosystem. Its 38% conciseness advantage makes it easier to scan and understand the overall architecture.

**Kimi version** provides valuable detail, particularly around Schema Plugin internals and alternative options analysis. Its explicit separation of consumer-specific directories makes individual plugin boundaries clearer. However, the duplicated Schema Plugin presentation and duplicated design decisions across two appendices create potential confusion.

**Best path forward:** Use GLM's structure as the primary document, while keeping Kimi available as a detailed reference for Schema Plugin internals and option exploration.
