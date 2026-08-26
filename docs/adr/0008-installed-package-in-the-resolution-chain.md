# ADR-0008 — An installed package is a Foundation resolution strategy

- **Status:** Accepted
- **Date:** 2026-08-26
- **Change Level:** L2
- **Risk Flags:** none
- **Amends:** ADR-0003 (offline layered Foundation resolution)

## Context

ADR-0003 resolves a Foundation through **explicit → workspace → cache**. That chain was written
before there was anything to install.

The package now ships `foundation/` and `stacks/`, so `npm i -D github:Rogers-Ribeiro/aief`
places a complete, version-pinned Foundation inside the consumer's repository. The resolver did
not look there. Verified against a clean machine — the user cache moved aside — a project with
the package installed still failed:

```text
foundation: version "0.3.1" could not be resolved offline. Tried:
  workspace: .../foundation
  cache: ~/.aief/foundation/0.3.1
```

The workaround was `--foundation node_modules/aief/foundation` on every command. That works, and
it is the kind of friction that gets solved by someone writing an alias — at which point the
Foundation path becomes personal configuration the repository depends on, which C9 and §18.4
exist to prevent.

## Decision

**Add `installed` to the chain, between `workspace` and `cache`:**

```text
explicit     --foundation <path>                      the reader overrides everything
workspace    ./foundation                             self-hosting, no bootstrap special case
installed    ./node_modules/aief/foundation           pinned by the consumer's manifest
cache        ~/.aief/foundation/<version>             ecosystems with no package manager here
```

The position is the decision, and both neighbours are deliberate.

**Below workspace**, so this repository keeps governing itself from its own `foundation/` even
when an older copy of the package is installed as a transitive dependency.

**Above cache**, because an installed package is pinned by the consumer's manifest and travels
with the repository, while the cache is a shared user-level directory that may hold anything a
previous project left there. Between two answers, prefer the one the repository states about
itself.

A version mismatch remains loud: `loadFoundation` already checks that the sidecar declares the
version the Project Profile requested, so an installed package that has drifted fails by name
rather than resolving quietly.

Stack Profiles need no change. `stacks/` sits beside `foundation/` inside the package, which is
the sibling layout the loader already searches.

## Consequences

**Positive**

- A consuming project runs `npx aief compose` with no flag, and the Foundation version it
  resolves is the one its `package.json` pins — reproducible on a colleague's machine and in CI.
- Removes the pressure to solve a path problem with a shell alias, which is where a repository
  starts depending on one person's setup.
- Nothing fetches. The package arrives through the ecosystem's own installer, before the engine
  runs.

**Negative**

- The engine now knows one ecosystem's directory name. `node_modules/aief` is Node-specific
  knowledge sitting in a layer that is supposed to be neutral. It is confined to one path in one
  function, and a second ecosystem would need its own entry — which is the moment to ask whether
  this belongs behind a Stack Profile declaration instead.
- Four strategies is one more thing to hold in mind when a resolution surprises someone. The
  failure message lists every path tried, which is the mitigation and the reason that message
  exists.

## Alternatives Considered

| Alternative                                                     | Rejected because                                                                                                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Keep `--foundation` as the answer**                           | Correct and unusable. Repeated friction becomes an alias, and the alias becomes personal configuration the repository silently depends on (§18.4, C9).               |
| **A postinstall hook that copies the package into the cache**   | A lifecycle script that writes outside the project, for a project that may never run the engine. Also makes the cache authoritative for a version the manifest pins. |
| **Put `installed` above `workspace`**                           | An installed copy would outrank this repository's own Foundation, breaking self-hosting the moment `aief` appeared as a transitive dependency.                       |
| **Put `installed` below `cache`**                               | The shared cache would win over the version the repository pins, which is the less specific answer beating the more specific one.                                    |
| **Have the Stack Profile declare where its ecosystem installs** | The right shape eventually, and too much machinery for one path today. Recorded as the trigger below rather than built speculatively (§28.2).                        |

## Trigger to Revisit

- A second ecosystem needs its own install location, which turns one Node-specific path into a
  list and argues for a Stack Profile declaration instead.
- Package managers that do not materialize `node_modules` (Yarn PnP, for instance) appear among
  consumers, since the path would then exist in the manifest but not on disk.
