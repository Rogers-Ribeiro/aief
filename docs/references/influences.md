# Reference influences (non-normative)

This file is explicitly non-normative and exists for traceability: a borrowed idea
should be checkable against its source. Nothing here defines AIEF semantics.

| Source                         | Ideas drawn on                                                                                                                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Langfuse**                   | A repo-owned, tool-neutral directory as the source of agent behaviour; a first-class architecture-principles document; progressive disclosure with delegation to specific files; generating per-tool configuration from one neutral source                                                  |
| **Trigger.dev**                | A small number of focused agent roles rather than many; minimal-diff discipline; preferring real dependencies over mocks in integration tests; fast type-level verification as a signal distinct from build                                                                                 |
| **OpenAI Codex repository**    | Measurable engineering limits; explicit verification evidence; keeping public surfaces small and modules private by default; concrete test anti-patterns such as not testing statically defined values                                                                                      |
| **TechRemoteHub/Claude-Setup** | The instruction-placement decision tree; context-budget thinking; path-scoped rules; personal-versus-project configuration; show-before-write; recurring-friction-driven configuration evolution; avoiding empty scaffolding; the distinction between hard requirements and polite requests |
