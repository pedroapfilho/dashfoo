# Shared components

`components/ui` contains the shadcn Base UI registry modules for the style in `components.json`. Preserve upstream exports, props, defaults, DOM semantics, and interactions. Product compositions belong outside that directory. Variant factories are exported beside the component, so `doctor.config.json` waives React Doctor's `only-export-components` rule for this directory.

The product palette stays in `app/global.css`, which loads `shadcn/tailwind.css` and maps semantic colors to the existing Fumadocs theme. All six design-system lint rules apply to primitives too. Arbitrary registry values use equivalent named radius, text-size, and color-mix tokens; formatting and import paths follow this repository.

`shadcn.lock.json` records the upstream reference, registry payload hashes, reviewed installed source hashes, and required CSS declarations. `pnpm check:shadcn` rejects changed or missing primitives, unregistered modules, and missing CSS declarations. It does not hash branding or fetch upstream updates.

For registry updates, review the upstream change, apply equivalent normalizations, migrate callers, and run lint, formatting, typechecks, tests, and the production build before updating the lock. Never refresh hashes to bless a custom fork. The complete primitive modules are Fallow entry points so their upstream exports remain available.
