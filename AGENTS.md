# Monorepo Rules

This repository is a strict monorepo with:

- `apps/web`: the Next.js website
- `apps/mobile`: the React Native mobile app
- `packages/shared`: shared cross-platform domain logic, types, and pure utilities

## Non-negotiable parity rule

The web app and the mobile app must always have:

- the same features
- the same information architecture
- the same behavior
- the same visual design direction
- the same naming
- the same empty states, loading states, and error states

If a feature is added, removed, or changed in one app, the other app must be updated in the same task unless the user explicitly says otherwise.

## Implementation expectations

- Prefer sharing pure domain logic, formatting, types, and mapping helpers through `packages/shared`.
- Do not let one platform drift from the other.
- The default parity strategy is: `apps/mobile` should render the real `apps/web` experience inside the React Native shell unless the user explicitly asks for a native-only divergence.
- If a new feature is added to `apps/web`, make sure it remains reachable and working in `apps/mobile` without a separate reimplementation.
- If a platform-specific limitation exists, match the behavior and presentation as closely as possible and document the gap in the final response.
- New screens should be created in both apps together.
- Design changes must be mirrored across both apps.

## Repo hygiene

- Keep web-only code in `apps/web`.
- Keep mobile-only code in `apps/mobile`.
- Keep shared code platform-agnostic inside `packages/shared`.
- Do not move business logic into duplicated copies when it can be shared safely.
