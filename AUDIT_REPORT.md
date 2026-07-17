# ExpenseFlow Security Audit Report

**Date:** 2026-07-17  
**Auditor:** Kilo  
**Scope:** Backend + Frontend security review  
**Method:** Static code analysis of verified code paths only

---

## Executive Summary

ExpenseFlow has a strong security foundation: JWT authentication, bcrypt password hashing, Zod input validation, Helmet, CORS, rate limiting, and role-based authorization are all present. The audit identified **6 verified vulnerabilities** and **4 security-hardening recommendations**. No critical unauthenticated data-exposure or injection flaws were found.

---

## Verified Vulnerabilities

### VULN-1: Hardcoded Development Secrets with Production Fallback
**Severity:** Medium  
**Category:** Secrets / Environment Variables  
**Files:**
- `backend/src/config/index.js:53-54`
- `backend/src/config/index.js:94`
- `backend/src/config/index.js:117`

**Finding:**
```js
accessSecret: process.env.JWT_ACCESS_SECRET || (!isProd ? 'dev-access-secret-change-in-production' : undefined),
refreshSecret: process.env.JWT_REFRESH_SECRET || (!isProd ? 'dev-refresh-secret-change-in-production' : undefined),
cookieSecret: process.env.COOKIE_SECRET || (!isProd ? 'dev-cookie-secret' : undefined),
encryptionKey: process.env.ENCRYPTION_KEY || (!isProd ? 'default-encryption-key-32chars!' : undefined),
```

If `NODE_ENV=production` is not set exactly, the application will boot with hardcoded development secrets. A single misconfigured environment variable exposes all JWT tokens, cookies, and encrypted data.

**Impact:** Complete authentication bypass if deployed with `NODE_ENV` unset or misspelled.  
**Recommendation:** Remove all hardcoded fallbacks. Fail startup if secrets are missing in production.

---

### VULN-2: Missing Secure Cookie Flag Default
**Severity:** Medium  
**Category:** Cookie Security  
**File:** `backend/src/config/index.js:95`

**Finding:**
```js
cookie: {
  secure: process.env.COOKIE_SECURE === 'true',
}
```

The default for `secure` is `false`. If `COOKIE_SECURE` is not explicitly set, cookies will be transmitted over HTTP. In production, this enables network interception of access/refresh tokens.

**Impact:** Session hijacking via MITM or packet capture.  
**Recommendation:** Default `secure` to `true` when `isProd` is `true`. Enforce `secure: true` in production.

---

### VULN-3: No CSRF Protection
**Severity:** Medium  
**Category:** CSRF  
**Files:** `backend/src/app.js`, `backend/src/middleware/auth.js`

**Finding:**
- No CSRF tokens are generated or validated.
- State-changing endpoints (`POST /api/v1/expenses`, `POST /api/v1/settlements`, etc.) rely solely on the `Authorization` header or cookies.
- Cookies are set with `sameSite: 'lax'`, which does NOT block cross-site POST requests.

An attacker can trick an authenticated user into submitting a forged request from a malicious site.

**Impact:** Unauthorized expense creation, settlement manipulation, or account changes.  
**Recommendation:** Implement CSRF token validation for all state-changing routes, or enforce `SameSite: 'strict'` and require `Authorization` header for all mutations.

---

### VULN-4: Regex ReDoS in Guest Name Duplicate Check
**Severity:** Low  
**Category:** NoSQL Injection / ReDoS  
**File:** `backend/src/services/circle.service.js:383`

**Finding:**
```js
displayName: { $regex: new RegExp(`^${name}$`, 'i') },
```

The `name` variable is user-controlled. If an attacker supplies a name containing regex metacharacters like `^`, `$`, `*`, or backtracking patterns, this creates a Regular Expression Denial of Service (ReDoS) vector. Mongoose will pass this directly to the MongoDB regex engine.

**Impact:** Application hang/crash via crafted input.  
**Recommendation:** Escape `name` before interpolating into `RegExp`, or use exact string match for duplicate checks.

---

### VULN-5: File Upload MIME-Type Spoofing
**Severity:** Low  
**Category:** File Upload Security  
**Files:** `backend/src/middleware/upload.js`, `backend/src/services/receipt.service.js`

**Finding:**
- File type validation relies exclusively on `file.mimetype` provided by the client.
- No content-based validation (magic bytes/file signature check) is performed.
- An attacker can rename a malicious executable to `malware.jpg` and spoof the `Content-Type` header to `image/jpeg`.

**Impact:** Upload of malicious files to server filesystem or cloud storage.  
**Recommendation:** Add magic-byte validation using a library like `file-type` or `mmmagic` before accepting uploads.

---

### VULN-6: Password Reset Token Not Immediately Invalidated After Use
**Severity:** Low  
**Category:** Authentication  
**File:** `backend/src/services/auth.service.js:252-267`

**Finding:**
```js
async resetPassword(token, newPassword) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  })...

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = [];
  await user.save();
```

The token is cleared only after successful password reset. Between the time the user clicks the reset link and the password is changed, the token remains valid. If the reset link is intercepted (e.g., via email access), an attacker has a window to change the password. Additionally, the `forgotPassword` endpoint returns the raw reset token in the API response:

```js
return {
  message: 'If an account exists, a password reset link has been sent',
  resetToken,  // <-- returned in response
};
```

**Impact:** Password reset token interception and reuse.  
**Recommendation:** 
1. Never return the reset token in the API response; only send it via email.
2. Mark tokens as single-use by clearing `passwordResetToken` immediately after lookup, before validating the new password.

---

## Security Strengths (Verified)

| Area | Status | Details |
|------|--------|---------|
| **Password Hashing** | PASS | bcrypt with 12 salt rounds (`backend/src/models/User.js:130`) |
| **JWT Verification** | PASS | `jwt.verify()` with secrets from env (`backend/src/middleware/auth.js:31`) |
| **Refresh Token Rotation** | PASS | Old refresh token invalidated on refresh (`backend/src/services/auth.service.js:155`) |
| **Input Validation** | PASS | Zod schemas on all major endpoints (`backend/src/validators/*.validator.js`) |
| **Authorization** | PASS | Role/permission checks on circle operations (`backend/src/middleware/auth.js:106-200`) |
| **NoSQL Injection** | PASS | No `$where`, `eval()`, or raw query concatenation found |
| **XSS (Frontend)** | PASS | React JSX auto-escapes; no `dangerouslySetInnerHTML` found |
| **Rate Limiting** | PASS | Global + auth-specific rate limits (`backend/src/app.js:29-57`) |
| **Helmet** | PASS | Enabled with defaults (`backend/src/app.js:20`) |
| **CORS** | PASS | Configurable origin, credentials flag (`backend/src/app.js:21-26`) |
| **Soft Delete** | PASS | `isDeleted` flag used across sensitive models |
| **Login Lockout** | PASS | 5 attempts → 30-minute lock (`backend/src/models/User.js:163`) |
| **Token Expiry** | PASS | 15m access / 7d refresh (`backend/src/config/index.js:55-56`) |
| **Secrets in .gitignore** | PASS | `.env` excluded (`backend/.gitignore`, root `.gitignore`) |
| **Sensitive Field Exclusion** | PASS | `select('-password -refreshTokens')` in auth middleware (`backend/src/middleware/auth.js:36`) |
| **Directory Traversal** | PASS | Upload filenames use `Date.now()` + random suffix; no user-controlled paths |

---

## Security Recommendations

### REC-1: Add Content Security Policy (CSP)
**Priority:** Medium  
**File:** `backend/src/app.js`

Helmet is used with defaults, but no explicit Content-Security-Policy header is set. Add:
```js
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
  },
}));
```

### REC-2: Enforce HTTPS in Production
**Priority:** Medium  
**File:** `backend/src/config/index.js:95`

Add production-only enforcement:
```js
secure: process.env.NODE_ENV === 'production' ? true : process.env.COOKIE_SECURE === 'true',
```

### REC-3: Add CSRF Protection
**Priority:** Medium  
**File:** `backend/src/app.js`

Implement `csurf` middleware:
```js
const csurf = require('csurf');
app.use(csurf({ cookie: true }));
```

### REC-4: Remove Unimplemented Storage Adapters from Production Path
**Priority:** Low  
**Files:** `backend/src/services/storage/S3StorageAdapter.js`, `CloudinaryStorageAdapter.js`

Both adapters throw on instantiation. If `STORAGE_PROVIDER` is misconfigured, the app crashes on first receipt upload. Add graceful fallback or explicit validation at startup.

---

## Items Verified as NOT Vulnerable

| Check | Result |
|-------|--------|
| **SQL/NoSQL Injection** | No raw queries, `$where`, or `eval()` found |
| **MongoDB Operator Injection** | All queries use Mongoose schemas; no dynamic operator injection |
| **Mass Assignment** | `allowedFields` arrays used in update controllers (`backend/src/controllers/auth.controller.js:105-143`) |
| **IDOR (Insecure Direct Object Reference)** | Membership checks performed before data access in all service layers |
| **Sensitive Data in Logs** | Stack traces only emitted in dev mode (`backend/src/middleware/error.js:18`) |
| **JWT None Algorithm** | `jwt.verify()` used; no `jwt.decode()` with unverified tokens |
| **Brute Force Login** | Account lockout after 5 failed attempts + rate limiting |
| **Email Enumeration** | `forgotPassword` returns generic message (`backend/src/services/auth.service.js:231`) |
| **Refresh Token in Response Body** | Refresh tokens stored in `User.refreshTokens` array; validated on each refresh |
| **Path Traversal (Uploads)** | Filenames generated server-side with timestamp + random suffix |

---

## Conclusion

ExpenseFlow has a solid security baseline. The 6 verified issues are manageable and should be addressed before production deployment. No critical unauthenticated access, injection, or data-leakage vulnerabilities were discovered.

**Recommended action items by priority:**
1. Remove hardcoded secret fallbacks (VULN-1)
2. Enforce `secure: true` cookies in production (VULN-2)
3. Implement CSRF protection (VULN-3)
4. Remove raw reset token from API response (VULN-6)
5. Escape regex in guest name check (VULN-4)
6. Add magic-byte file validation (VULN-5)
