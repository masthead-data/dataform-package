# Copilot Instructions for Dataform Reservation Package

This document captures key learnings, debugging strategies, and architectural nuances discovered during the development of the `@masthead-data/dataform-package`.

## How to Debug

### 1. Tracing Compilation
Dataform executes JavaScript during the compilation phase. To trace what's happening:
- Use `console.error()` for debug logs. This ensures logs go to `stderr` and don't corrupt the JSON output redirected to a file.
- Avoid `console.log()` inside Dataform definitions if you plan to pipe the output to a JSON parser, as it may inject plain text into the JSON stream.

### 2. Inspecting the Graph
To see the final state of all actions:
```bash
cd test-project
npx @dataform/cli compile --json > compiled.json
```
Inspect the `tables`, `operations`, and `assertions` arrays in the resulting JSON. Check `preOps` and `queries` for the injected `SET @@reservation` statements.

### 3. Verification Script
Use the provided verification script to check invariants:
```bash
node scripts/verify_compilation.js
```
This script validates that reservations are prepended and that assertions are skipped.

## Testing Configuration

See [CONTRIBUTING.md](../CONTRIBUTING.md#development-setup) for detailed testing instructions, including matrix testing and fast iteration modes.

**CI Integration:** GitHub Actions runs matrix tests on every PR.

## Lockfile Maintenance

See [CONTRIBUTING.md](../CONTRIBUTING.md#1-lockfile-maintenance) for details on handling platform-specific bindings and avoiding missing dependency errors in CI.

## Hard-Learned Dataform Nuances

### 1. Builder vs Proto
Dataform makes a distinction between **Action Builders** (the objects returned by `publish()`, `operate()`, etc.) and the final **Proto Objects** (the serialized state).
- **Modification Point:** To ensure persistence, modifications should be made to `action.contextablePreOps` or `action.contextableQueries` on the **Builder**. If you only modify `proto.preOps`, Dataform's internal resolution logic might overwrite your changes during the final compilation phase.

### 2. SQLX Pre-operations
In `.sqlx` files, `pre_operations { ... }` blocks are internal to Dataform. When monkeypatching, we must ensure our reservation statement is **prepended** (using `.unshift()`) so it executes before any user-defined variables or temporary functions.

### 3. The `queries()` method
For `operations`, the SQL is often set via `.queries(["SQL"])`. This method can be called multiple times or late in the script. We monkeypatch this method on the builder instance to wrap the user's input, ensuring the reservation is always at the top of the list, regardless of when `queries()` is called.

### 4. Assertions
Assertions in Dataform are strict. They expect a single `SELECT` statement. Prepending a `SET` statement will cause a syntax error in BigQuery because assertions are often wrapped in subqueries or views by Dataform. We explicitly skip assertions in this package.

### 5. Outer DECLARE Detection
Operations where `DECLARE` is the first statement at the outer level are automatically skipped. BigQuery requires `DECLARE` before any other statements in a script, so prepending `SET @@reservation` would fail. The package strips leading whitespace and SQL comments (`--`, `#`, `/* */`) to reliably detect this case. `DECLARE` inside `BEGIN...END` or `EXECUTE IMMEDIATE` is not flagged — reservation is applied normally in those cases.

## Release Process

See [CONTRIBUTING.md](../CONTRIBUTING.md#release-process) for the full release workflow steps.

## Known Limitations & Future Work

**Performance:** `findReservation` uses linear scan (acceptable for typical project sizes <1000 actions)
