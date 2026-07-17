# ExpenseFlow Dependency Audit Report

**Date:** 2026-07-17  
**Auditor:** Kilo  
**Scope:** All npm dependencies across root, backend, and frontend  
**Method:** Static analysis + `npm audit` + `npm outdated` + usage tracing

---

## Executive Summary

The project has **0 known vulnerabilities** but contains **5 unused packages** (2 backend, 3 frontend) that should be removed. There are **no deprecated packages**, **no license conflicts**, and **no security advisories**. The main concern is the oversized `lucide-react` package (34.9 MB on disk) and several outdated dependencies that could be safely updated.

**Overall: CONDITIONAL GO — safe to proceed after removing unused dependencies.**

---

## Verified Findings

### DEP-1: Unused Backend Package — `moment`
**Severity:** Medium  
**Category:** Unused Dependencies  
**File:** `backend/package.json:34`

**Finding:**
```json
"moment": "^2.30.1"
```

`moment` is listed as a dependency but has **zero imports** in `backend/src/`. A full grep of all `.js` files in the backend source returned no matches for `moment` or `moment()`.

**Impact:** 4.1 MB of unnecessary disk space; adds to install time and attack surface.

**Recommendation:** Remove `moment` from `backend/package.json` and run `npm prune`.

---

### DEP-2: Unused Backend Package — `slugify`
**Severity:** Medium  
**Category:** Unused Dependencies  
**File:** `backend/package.json:39`

**Finding:**
```json
"slugify": "^1.6.6"
```

`slugify` is listed as a dependency but has **zero imports** in `backend/src/`. A full grep returned no matches.

**Impact:** 0.0 MB on disk (minimal), but unnecessary dependency.

**Recommendation:** Remove `slugify` from `backend/package.json`.

---

### DEP-3: Unused Frontend Package — `recharts`
**Severity:** Medium  
**Category:** Unused Dependencies / Bundle Impact  
**File:** `frontend/package.json:21`

**Finding:**
```json
"recharts": "^2.15.4"
```

`recharts` is listed as a dependency but has **zero imports** in `frontend/src/`. The only match for "recharts" in the codebase is `BarChart3` from `lucide-react`, which is an icon name, not the charting library.

**Impact:** 4.4 MB on disk; if bundled, adds significant weight to the frontend. Even if tree-shaken, the package itself is large.

**Recommendation:** Remove `recharts` from `frontend/package.json` unless charts are planned for a future milestone.

---

### DEP-4: Unused Frontend Package — `@hookform/resolvers`
**Severity:** Medium  
**Category:** Unused Dependencies  
**File:** `frontend/package.json:12`

**Finding:**
```json
"@hookform/resolvers": "^5.2.2"
```

`@hookform/resolvers` is listed as a dependency but has **zero imports** in `frontend/src/`. A full grep for `@hookform/resolvers`, `zodResolver`, and `hookform` returned no matches.

**Impact:** 1.0 MB on disk; unnecessary dependency.

**Recommendation:** Remove `@hookform/resolvers` from `frontend/package.json`.

---

### DEP-5: Unused Frontend Package — `react-hook-form`
**Severity:** Medium  
**Category:** Unused Dependencies  
**File:** `frontend/package.json:19`

**Finding:**
```json
"react-hook-form": "^7.71.2"
```

`react-hook-form` is listed as a dependency but has **zero imports** in `frontend/src/`. A full grep for `useForm`, `Controller`, `useController`, `FormProvider`, and `react-hook-form` returned no matches.

**Impact:** 1.3 MB on disk; unnecessary dependency.

**Recommendation:** Remove `react-hook-form` from `frontend/package.json`.

---

### DEP-6: Heavy Package — `lucide-react`
**Severity:** Low  
**Category:** Heavy Packages / Bundle Impact  
**File:** `frontend/package.json:16`

**Finding:**
```json
"lucide-react": "^0.575.0"
```

`lucide-react` is **34.9 MB** on disk, making it the largest frontend dependency by far. It bundles all 1500+ Lucide icons. The codebase imports from 34 files using approximately 100+ unique icons.

**Impact:** Large `node_modules` size and potential bundle bloat if tree-shaking fails. However, lucide-react supports tree-shaking via named exports, so only used icons should be included in the production bundle.

**Recommendation:** 
- Verify tree-shaking is working by inspecting the production bundle
- If bundle size is a concern, consider switching to a lighter icon strategy (e.g., SVG sprite, `lucide-static` subset, or `@phosphor-icons/react`)

---

### DEP-7: Heavy Package — `mongoose`
**Severity:** Low  
**Category:** Heavy Packages  
**File:** `backend/package.json:35`

**Finding:**
```json
"mongoose": "^8.6.3"
```

`mongoose` is **8.9 MB** on disk. This is expected for an ODM with MongoDB driver bundled. It is actively used throughout the backend.

**Impact:** Acceptable for a MongoDB-based backend. No action needed.

---

### DEP-8: Outdated Dependencies (Safe to Update)
**Severity:** Low  
**Category:** Outdated Versions  
**Files:** `backend/package.json`, `frontend/package.json`, `package.json`

**Finding:**
Multiple dependencies have newer patch/minor versions available. The following updates are **safe** (same major version, patch/minor bumps):

| Package | Current | Latest | Safe? |
|---------|---------|--------|-------|
| `@tailwindcss/postcss` | 4.3.2 | 4.3.3 | YES |
| `autoprefixer` | 10.5.2 | 10.5.4 | YES |
| `bcryptjs` | 2.4.3 | 3.0.3 | CAUTION (major) |
| `concurrently` | 8.2.2 | 10.0.3 | CAUTION (major) |
| `dotenv` | 16.6.1 | 17.4.2 | CAUTION (major) |
| `express` | 4.22.2 | 5.2.1 | CAUTION (major) |
| `express-rate-limit` | 7.5.1 | 8.6.0 | CAUTION (major) |
| `helmet` | 7.2.0 | 8.3.0 | CAUTION (major) |
| `husky` | 8.0.3 | 9.1.7 | CAUTION (major) |
| `mongoose` | 8.24.1 | 9.7.4 | CAUTION (major) |
| `resend` | 4.8.0 | 6.17.2 | CAUTION (major) |
| `tailwindcss` | 4.3.2 | 4.3.3 | YES |
| `vite` | 8.1.4 | 8.1.5 | YES |
| `vite-plugin-svgr` | 4.5.0 | 5.2.0 | CAUTION (major) |
| `zod` | 3.25.76 | 4.4.3 | CAUTION (major) |

**Recommendation:**
- Apply safe patch updates: `@tailwindcss/postcss`, `autoprefixer`, `tailwindcss`, `vite`
- Defer major version updates until dedicated upgrade sprints (Express 5, Zod 4, Mongoose 9, etc.)

---

### DEP-9: Extraneous Packages in Root `node_modules`
**Severity:** Low  
**Category:** Cleanup  
**Files:** Root `node_modules/`

**Finding:**
```
@emnapi/core@1.11.1 extraneous
@emnapi/runtime@1.11.1 extraneous
@emnapi/wasi-threads@1.2.2 extraneous
@napi-rs/wasm-runtime@1.1.6 extraneous
@tybys/wasm-util@0.10.3 extraneous
```

These packages are marked `extraneous` by npm, meaning they were installed as transitive dependencies but are not declared in any `package.json`. They likely come from native module builds (e.g., `bcryptjs`).

**Impact:** Minor disk usage; no functional impact.

**Recommendation:** Run `npm prune` to clean up extraneous packages.

---

### DEP-10: Node.js Engine Version Mismatch
**Severity:** Low  
**Category:** Configuration  
**Files:** `package.json`, `backend/package.json`

**Finding:**
- Root `package.json`: `"node": ">=20.0.0"`
- Backend `package.json`: `"node": ">=18.0.0"`

**Impact:** Inconsistent requirements could cause issues if backend is deployed with Node 18 while root expects Node 20+.

**Recommendation:** Align both to `"node": ">=20.0.0"`.

---

## Security Audit Results

### `npm audit` Summary

| Workspace | Vulnerabilities | Status |
|-----------|----------------|--------|
| Root | 0 | PASS |
| Backend | 0 | PASS |
| Frontend | 0 | PASS |

**Total dependencies audited:**
- Root: 744 packages (242 prod, 503 dev, 44 optional)
- Backend: included in root audit
- Frontend: included in root audit

**No known vulnerabilities found.**

---

## License Analysis

| Package | License | Type |
|---------|---------|------|
| bcryptjs | MIT | Permissive |
| cloudinary | MIT | Permissive |
| compression | MIT | Permissive |
| cookie-parser | MIT | Permissive |
| cors | MIT | Permissive |
| dotenv | BSD-2-Clause | Permissive |
| express | MIT | Permissive |
| express-rate-limit | MIT | Permissive |
| helmet | MIT | Permissive |
| jsonwebtoken | MIT | Permissive |
| moment | MIT | Permissive |
| mongoose | MIT | Permissive |
| morgan | MIT | Permissive |
| multer | MIT | Permissive |
| resend | MIT | Permissive |
| slugify | MIT | Permissive |
| socket.io | MIT | Permissive |
| zod | MIT | Permissive |
| axios | MIT | Permissive |
| react | MIT | Permissive |
| react-dom | MIT | Permissive |
| lucide-react | ISC | Permissive |
| recharts | MIT | Permissive |
| sonner | MIT | Permissive |
| tailwind-merge | MIT | Permissive |
| clsx | MIT | Permissive |
| @tanstack/react-query | MIT | Permissive |
| react-router-dom | MIT | Permissive |

**No license conflicts detected.** All dependencies use permissive open-source licenses (MIT, BSD-2-Clause, ISC).

---

## Bundle Impact Analysis

### Backend
| Package | Disk Size | Bundle Impact | Action |
|---------|-----------|---------------|--------|
| mongoose | 8.9 MB | Required | Keep |
| moment | 4.1 MB | **UNUSED** | Remove |
| zod | 3.4 MB | Required | Keep |
| socket.io | 1.4 MB | Required | Keep |
| cloudinary | 0.3 MB | Required | Keep |
| express | 0.3 MB | Required | Keep |
| bcryptjs | 0.2 MB | Required | Keep |
| resend | 0.1 MB | Required | Keep |
| Others | <0.1 MB | Required | Keep |

**Potential savings:** 4.1 MB by removing `moment`

### Frontend
| Package | Disk Size | Bundle Impact | Action |
|---------|-----------|---------------|--------|
| lucide-react | 34.9 MB | Tree-shakeable | Monitor |
| react-dom | 7.0 MB | Required | Keep |
| recharts | 4.4 MB | **UNUSED** | Remove |
| zod | 3.4 MB | Required | Keep |
| axios | 1.7 MB | Required | Keep |
| @hookform/resolvers | 1.0 MB | **UNUSED** | Remove |
| react-hook-form | 1.3 MB | **UNUSED** | Remove |
| @tanstack/react-query | 0.8 MB | Required | Keep |
| socket.io-client | 1.4 MB | Required | Keep |
| tailwind-merge | 1.0 MB | Required | Keep |
| Others | <0.5 MB | Required | Keep |

**Potential savings:** 6.7 MB by removing `recharts`, `@hookform/resolvers`, `react-hook-form`

---

## Recommendations

### Immediate (Pre-Production)
1. **Remove unused backend packages:** `moment`, `slugify`
2. **Remove unused frontend packages:** `recharts`, `@hookform/resolvers`, `react-hook-form`
3. **Run `npm prune`** to clean extraneous packages
4. **Align Node.js engine versions** to `>=20.0.0` in both root and backend `package.json`
5. **Apply safe patch updates:** `@tailwindcss/postcss`, `autoprefixer`, `tailwindcss`, `vite`

### Short-Term (Production)
6. **Verify lucide-react tree-shaking** — inspect production bundle to confirm only used icons are included
7. **Monitor bundle size** — add `rollup-plugin-visualizer` to track bundle composition
8. **Schedule major version upgrades** for Express 5, Zod 4, Mongoose 9 in dedicated sprints

### Long-Term (Maintenance)
9. **Enable Dependabot** or Renovate for automated dependency updates
10. **Add `npm audit` to CI/CD** pipeline to catch new vulnerabilities immediately
11. **Consider `npm ci`** for reproducible production installs
12. **Add `package-lock.json` or `pnpm-lock.yaml`** to the repository (currently missing)

---

## Appendix: Unused Package Removal Commands

```bash
# Backend
cd backend
npm uninstall moment slugify

# Frontend
cd frontend
npm uninstall recharts @hookform/resolvers react-hook-form

# Clean up
npm prune
```
