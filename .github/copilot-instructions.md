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

### Local Integration Testing
The `test-project` is configured to use the local version of the package. In `test-project/package.json`:
```json
"dependencies": {
  "@masthead-data/dataform-package": "file:../"
}
```
**Note:** `npm ci` or `npm install` in the `test-project` caches the local package. If you make changes to `index.js` and don't see them reflected, you may need to force an update or avoid `npm ci` during rapid iteration.

### Running Tests

#### Matrix Testing (Default)
Run from the root to test all supported versions:
```bash
npm test
```
This automatically runs matrix tests across v2.4.2 and latest v3.X.X versions, managing config file conflicts.

#### Single Version (Fast Iteration)
For rapid development on the current version:
```bash
npm run test:single
```
This runs:
1. `jest`: Unit tests for helper functions
2. `dataform compile`: Generates the actual project graph
3. `verify_compilation.js`: In-depth JSON inspection

#### Specific Version
Test a single Dataform version:
```bash
npm test -- 2.4.2
```

**Note:** Matrix tests handle `dataform.json` (v2) vs `workflow_settings.yaml` (v3) conflicts automatically with cleanup traps.

**CI Integration:** GitHub Actions runs matrix tests on every PR.

## Package Architecture

### Exported Methods
1. **`autoAssignActions(config)`** - Primary method: global monkeypatch of `publish()`, `operate()`, `assert()` and `sqlxAction()`
2. **`createReservationSetter(config)`** - Secondary method: returns a function for manual per-file application
3. **`getActionName(ctx)`** - Utility: extracts action names from Dataform contexts

### Key Implementation Details
- **Monkeypatching Strategy:** Intercepts global methods immediately after config is loaded (use `_reservations.js` prefix to run first)
- **Config Preprocessing:** Converts `actions` arrays to Sets for O(1) lookup performance
- **Builder Modification:** Always modify `contextablePreOps`/`contextableQueries` on builders, not proto objects
- **Assertions:** Explicitly skipped to avoid SQL syntax errors in BigQuery

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

## Release Process

1. Update `CHANGELOG.md` with version and changes
2. Bump version in `package.json` and `README.md`
3. Run `npm test` to verify matrix tests pass
4. Commit and push to branch
5. Create PR, ensure CI passes
6. Merge to main
7. Tag release: `npm run release --tag_version=x.y.z`

## Known Limitations & Future Work

**Performance:** `findReservation` uses linear scan (acceptable for typical project sizes <1000 actions)
