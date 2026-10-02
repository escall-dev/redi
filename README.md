# Seijun

Seijun is a personal cycle companion and reproductive health tracker built with Next.js, React, Tailwind CSS, and Supabase.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

---

## Versioning & Release Identity

Seijun adheres strictly to **Semantic Versioning (`MAJOR.MINOR.PATCH`)**.

### 1. Canonical Version Source
The single authoritative source of truth for the application version is defined in `package.json` and mirrored in `package-lock.json`.
Application code and UI components import the version from:
```ts
import { APP_VERSION, APP_VERSION_LABEL } from "@/lib/version"
```
No component or page may define, invent, or hardcode version numbers.

### 2. Release Identity vs. Diagnostic Metadata
The application version is strictly decoupled from build, deployment, and VCS metadata:
- **Application SemVer (`MAJOR.MINOR.PATCH`)**: Represents intentional product releases (e.g., `1.18.4`, `1.19.0`).
- **Git Commit SHA**: Identifies a specific snapshot in version control history.
- **Vercel Deployment ID**: Identifies an environment-specific hosting deployment.
- **Build ID**: An artifact compilation identifier.
- **PWA / Service Worker**: Independent offline and Web Push lifecycle; does not alter application SemVer.

### 3. Why Git Commits and Deployments Do Not Change Versions
- **A Git commit is not a release.** Developers and agents make dozens of commits while working on features and fixes without creating a new SemVer release.
- **A Vercel deployment is not a release.** Deployments to staging or preview environments reflect infrastructure synchronization, not product versions.
- Automatic git pre-commit version bumping is permanently disabled.

### 4. Semantic Versioning Selection Rules
Releases must be intentionally triggered according to standard SemVer principles:

- **PATCH (`X.Y.Z+1`)**: Bug fixes, minor adjustments, documentation, and non-breaking maintenance changes.
  ```bash
  npm run release:patch
  ```
  *Example: `1.19.0 -> 1.19.1`*

- **MINOR (`X.Y+1.0`)**: Backward-compatible new features, functional enhancements, and meaningful product iterations.
  ```bash
  npm run release:minor
  ```
  *Example: `1.18.4 -> 1.19.0`*

- **MAJOR (`X+1.0.0`)**: Breaking API changes, major architectural overhauls, or new product generations.
  ```bash
  npm run release:major
  ```
  *Example: `1.19.0 -> 2.0.0`*

### 5. Intentional Release Workflow
1. Complete all feature implementation, audits, and verification at the baseline version.
2. Run the test suite: `npm test`
3. Run the production build: `npm run build`
4. Execute the intentional release script: `npm run release:patch` (or `minor` / `major`).
5. Commit the intentional release change.
