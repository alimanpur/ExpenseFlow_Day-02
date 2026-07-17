# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in ExpenseFlow, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email security details to: security@expenseflow.app
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

## Security Measures

- All data encrypted at rest and in transit
- JWT-based authentication with secure HTTP-only cookies
- Input validation via Zod schemas
- SQL injection prevention via Mongoose ODM
- XSS protection via React escaping
- CSRF protection on state-changing operations
- Rate limiting on authentication endpoints
- Secure file upload validation
