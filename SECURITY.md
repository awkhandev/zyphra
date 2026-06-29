# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Zyphra, please report it responsibly. **Do not open a public GitHub issue.**

### How to Report

1. **Email:** security@zyphra.dev (or contact the maintainers directly)
2. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

### Response Timeline

| Phase              | Timeframe                         |
| ------------------ | --------------------------------- |
| Acknowledgment     | Within 48 hours                   |
| Initial assessment | Within 5 business days            |
| Fix development    | Within 30 days (critical: 7 days) |
| Disclosure         | After fix is deployed             |

## Scope

The following are in scope:

- **API Key Security** — Any way to access, leak, or bypass master key encryption
- **Authentication Bypass** — Accessing protected routes without valid session
- **Authorization Escalation** — Accessing another workspace's data
- **Injection Attacks** — SQL injection, XSS, CSRF in the dashboard or API
- **Rate Limiting Bypass** — Circumventing rate limits on proxy or management endpoints
- **Data Exposure** — Leaking user emails, API keys, or usage data
- **Payment Bypass** — Accessing paid features without paying

The following are out of scope:

- Denial of service (DoS) attacks
- Social engineering
- Vulnerabilities in third-party services (Supabase, Vercel, etc.)

## Security Measures

Zyphra implements the following security controls:

- **AES-256-GCM encryption** for all stored API keys
- **SHA-256 hashing** for sub-key lookup (raw keys never stored)
- **Timing-safe comparison** for all signature/token validation
- **Rate limiting** via Upstash Redis on all API endpoints
- **CSRF protection** via double-submit cookie pattern
- **Security headers** (HSTS, X-Content-Type-Options, X-Frame-Options, etc.)
- **Structured logging** with automatic PII redaction
- **Row Level Security (RLS)** on all Supabase database tables

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
| < 0.1   | No        |

## Responsible Disclosure

We follow responsible disclosure principles. We ask that you:

1. Give us reasonable time to fix the issue before public disclosure
2. Do not access data that does not belong to you
3. Do not perform destructive testing on production systems

We will credit researchers who follow this process in our security acknowledgments.
