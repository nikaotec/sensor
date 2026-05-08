# Testing Patterns

**Analysis Date:** 2026-05-07

## Test Framework

**None formally configured** — the codebase has minimal automated testing infrastructure.

### Evolution API (evolution-api-main)

- **Test runner:** Manual — `npm test` runs `tsx watch ./test/all.test.ts`
- **Framework:** ad-hoc Node.js test script
- **No Jest, Vitest, or Mocha detected in package.json**

### Dashboard (dashboard)

- **No test framework installed** — no test scripts, no test runner
- **No testing library** (no `@testing-library/react`, no Jest/Vitest)

## Test File Organization

**No standard testing directory found.**

- `test/` folder exists in `evolution-api-main/` but only contains `all.test.ts`
- Dashboard has no `__tests__` or `.test.ts` files
- One manual test script in root: `test_user_flow.js`

### Observed Test Files

| File | Type | Purpose |
|------|------|---------|
| `test_user_flow.js` | ad-hoc Node script | Phone formatting + payload validation |
| `dashboard/src/tests/provision_user.js` | ad-hoc Node script | User provisioning test |
| `evolution-api-main/test/all.test.ts` | Manual tsx test | Unknown scope |
| `dashboard/test_supabase.js` | ad-hoc Node script | Supabase connection test |

## Test Structure

### Manual Test Scripts (Node.js)

**Location:** `test_user_flow.js`

```javascript
const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '');
    // ...
};

const testCases = [
    { input: '5', expected: '+5' },
    // ...
];

console.log('--- Testando Formatação ---');
testCases.forEach(tc => {
    const result = formatPhone(tc.input);
    const status = result === tc.expected ? 'PASS' : 'FAIL';
    console.log(`Input: ${tc.input} | Expected: ${tc.expected} | Result: ${result} | ${status}`);
    if (status === 'FAIL') process.exit(1);
});
```

**Pattern:** Simple input→expected validation with console output and exit code on failure.

### Supabase Connection Test

**Location:** `dashboard/test_supabase.js`

- Tests Supabase client connectivity
- Validates query execution

## Mocking

**No mocking framework detected.**

- No `sinon`, `jest.mock()`, `vi.fn()`, or equivalent
- Tests use real data/connections where needed

## Fixtures and Factories

**No test data factories found.**

- `dashboard/src/data/mockData.ts` — contains mock device data for UI development, not testing
- `server.js` writes to `src/data/telemetry.json` as runtime fixture

## Coverage

**Not enforced.**

- No coverage tool configured (no Istanbul, no v8 coverage)
- No coverage thresholds in package.json

## Integration Testing

### n8n Workflow Testing

n8n workflows are stored as JSON in the repository:

- `mqtt receive.json`
- `n8n_hourly_telemetry.json`
- `n8n_events_logger.json`
- `dashboard/n8n_workflow_mqtt.json`

These are tested by:
1. Importing JSON into n8n UI
2. Triggering via webhook/manual execution
3. Verifying database/state changes manually

## Common Patterns

### Phone Formatting Tests

```javascript
const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 0) return '';
    const limited = digits.slice(0, 13);
    let result = '+' + limited;
    // format with spaces and dash
    return result;
};
```

**Location:** `test_user_flow.js`

### Payload Validation

```javascript
const payload = {
    phone: newUserWhatsapp || null,
};
console.log('Payload phone:', payload.phone);
if (payload.phone !== newUserWhatsapp) {
    console.log('FAIL: Payload field mismatch');
    process.exit(1);
}
```

**Location:** `test_user_flow.js`

### Runtime State Verification

```javascript
// Check telemetry.json after API call
let existingContent = { history: [] };
if (fs.existsSync(filePath)) {
    try {
        existingContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
        // Ignore parse errors
    }
}
```

**Location:** `dashboard/server.js` (used for manual verification)

## Build-time Verification

### TypeScript Type Checking

```bash
# evolution-api-main
npm run build        # runs: tsc --noEmit && tsup

# dashboard
npm run build        # runs: tsc -b && vite build
```

Both projects run TypeScript compilation as part of build, catching type errors before deployment.

### Linting

```bash
# evolution-api-main
npm run lint         # eslint --fix --ext .ts src
npm run lint:check   # eslint --ext .ts src (read-only)

# dashboard
npm run lint         # eslint .
```

## Quality Gaps

### Missing Testing Infrastructure

- **No unit test runner** — projects lack Jest/Vitest
- **No mocking library** — cannot isolate units
- **No test coverage** — no visibility into untested code
- **No E2E testing** — no Playwright/Cypress

### Recommended Improvements

1. Add Vitest (lighter than Jest, good TypeScript support)
2. Write unit tests for utility functions (`formatPhone`, data normalization)
3. Add integration tests for API routes
4. Add E2E tests for dashboard UI flows
5. Enforce coverage thresholds in CI

---

*Testing analysis: 2026-05-07*