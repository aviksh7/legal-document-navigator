# Legal Document Navigator

**Current state:** an unchanged Next.js application scaffold with a minimal
engineering harness. Document processing and AI functionality are not implemented.
The intended product and its unresolved scope are described in [Product](docs/PRODUCT.md).

## Local setup

Use Node **24.18.0** from `.nvmrc` (with `nvm`, run `nvm install` and `nvm use`).
Use npm with the committed lockfile to install the same dependency versions.
No API keys or application services are required.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The scaffold page is
`src/app/page.tsx`; shared layout and styles are beside it.

## Quality checks

```sh
npm run check
```

This runs `check:repo`, `lint`, `typecheck`, and `build` in order. Type checking
generates Next.js route types first. To inspect the production build locally,
run `npm run start` after a successful build.

CI runs `npm ci` and the same four checks on pushes to `main` or manual dispatch.
It uses no application services, secrets, AI calls, deployments, or browser tests.
Package installation and the scaffold's Google-font build step require network
access; this is not a fully offline build.

## Documentation

- [Agent map and working rules](AGENTS.md)
- [Product scope](docs/PRODUCT.md) and [architecture](docs/ARCHITECTURE.md)
- [Design requirements](docs/DESIGN.md) and [planned AI system](docs/AI_SYSTEM.md)
- [Security and repository hygiene](docs/SECURITY.md)
- [Verification and future testing](docs/TESTING.md)
- [Engineering decisions](docs/DECISIONS.md)

Work stays on `main`. Review the complete diff and run the checks before an
explicitly requested commit. Test frameworks and feature dependencies are deferred
until meaningful implementations need them.
