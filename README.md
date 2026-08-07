# TrueTawakkul Company Portal (V2 Clean Slate)

Internal enterprise control center for TrueTawakkul platform founder & operations (`COMPANY_SUPER_ADMIN`).

---

## Clean Architecture Directory Structure

```
truetawakkul-company-portal/
├── src/
│   ├── domain/           ← Entities, Value Objects, Domain Enums, Pure Rules (0 Framework Deps)
│   ├── application/      ← Use Cases, Port Interfaces, Business Orchestration
│   ├── infrastructure/   ← PostgreSQL Repositories, Database Client Adapter, Storage, Outbox Worker
│   ├── api/              ← Express Controllers, Routes, Validators, Middleware (Auth, Idempotency, OCC)
│   ├── config/           ← Environment Variable Loader, System Constants
│   └── shared/           ← AppError Hierarchy, Pino Logger Wrapper, Crypto Helpers
├── tests/
│   ├── unit/             ← Domain & Application Layer Unit Tests (Fast)
│   ├── integration/      ← PostgreSQL Repository & API HTTP Integration Tests
│   └── factories/        ← Test Data Builders & Fixtures
├── supabase/
│   └── migrations/       ← Source of truth database migrations (20260807000000_genesis.sql)
└── package.json
```

---

## Architectural Guarantees & Constraints
1. **Domain Isolation:** `src/domain/` has ZERO external dependencies (no Express, no PostgreSQL driver, no Supabase SDK).
2. **Test-Driven Development (TDD):** Every feature follows the 🔴 Red → 🟢 Green → 🔵 Refactor cycle.
3. **Idempotency & OCC:** All mutating endpoints require `Idempotency-Key` and `If-Match` headers.
4. **Immutable Audit:** Every administrative state shift records an entry in `forensic.audit_events`.
