---
name: Orval barrel duplication
description: Workspace-specific behavior to check after regenerating OpenAPI clients with Orval.
---

After running the OpenAPI code generator, inspect the API client and Zod package barrels for duplicate generated-module exports and remove only the duplicate lines.

**Why:** In this workspace, Orval can append its preferred generated exports even when equivalent exports already exist, leaving duplicate barrel declarations despite successful generation and typechecking.

**How to apply:** After every OpenAPI regeneration, check the package index files for repeated exports before reviewing or committing the generated diff.