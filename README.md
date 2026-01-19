# Masthead Package for Dataform

![NPM Version](https://img.shields.io/npm/v/%40masthead-data%2Fdataform-package)

## Overview

This package is designed to optimize BigQuery resource usage by automatically assigning compute reservations to Dataform actions based on predefined configuration. This system enables businesses to efficiently manage their BigQuery costs and resource allocation with minimal manual intervention.

## Key Benefits

* **Cost optimization**: Automatically route high-priority workloads to reserved slots and low-priority workloads to on-demand pricing
* **Resource efficiency**: Ensure critical data pipelines get guaranteed compute resources while non-critical tasks use flexible pricing
* **Automated re-assignement**: Once configured, reservations are applied automatically based on action categorization
* **Flexible configuration**: Easy adjustment of reservation policies through configuration updates

## Compatibility

This package is tested and compatible with:

* **Dataform v2.4.2** (v2.x series)
* **Dataform v3.0.42** (v3.x series)

### Testing Across Versions

To verify compatibility locally across all supported Dataform versions:

```bash
npm test
```

This command runs the matrix test suite which automatically:
1. Iterates through all supported Dataform versions (v2 and v3).
2. Manages configuration file conflicts (e.g., hiding `dataform.json` for v3).
3. Executes unit tests and integration tests.

For faster iteration on the currently installed version in `test-project`, you can run:

```bash
npm run test:single
```

## Getting Started

### Initial Setup

Add the dependency to your `package.json`:

```json
{
  "dependencies": {
    "@masthead-data/dataform-package": "0.1.0"
  }
}
```

and click **Install Packages** in Dataform UI.

### Recommended: Automatic Application

The easiest way to integrate this package is to use automatic reservation application. Create a configuration file (e.g., `definitions/_reservations.js`) that will automatically apply reservations to all matching actions:

```javascript
const { applyAutomaticReservations } = require("@masthead-data/dataform-package");

const RESERVATION_CONFIG = [
  {
    tag: 'production',
    reservation: 'projects/{project}/locations/{location}/reservations/{name}',
    actions: [
      'project.dataset.important_table',
      'project.dataset.critical_view'
    ]
  },
  {
    tag: 'default',
    reservation: null,
    actions: []
  }
];

applyAutomaticReservations(RESERVATION_CONFIG);
```

**Note:** If you have many files in the project we recommend to start the filename with an underscore (e.g., `_reservations.js`) to ensure it runs first in the Dataform queue.

With automatic application, you don't need to add any reservation code to your individual action files — the package handles everything globally.

### Alternative: Manual Application

For more granular control, you can manually apply reservations per file. Create a setter function in your global scope under `/includes` directory:

```javascript
const { createReservationSetter } = require("@masthead-data/dataform-package");

const RESERVATION_CONFIG = [
  ...
];

const reservation_setter = createReservationSetter(RESERVATION_CONFIG);

module.exports = {
  reservation_setter
}
```

Then use `${reservation_setter(ctx)}` in each action file where you want to apply reservations (see usage examples below).

### Configuration Structure

Configuration object defining reservation policies:

```javascript
const RESERVATION_CONFIG = [
  {
    tag: 'editions',
    reservation: 'projects/{project}/locations/{location}/reservations/{name}',
    actions: [
      'project.dataset.table'
    ]
  },
  {
    tag: 'default',
    reservation: null,
    actions: []
  },
  {
    tag: 'on_demand',
    reservation: 'none',
    actions: [
      'project.action_name'
    ]
  }
]
```

Configuration arguments:

* **tag**: Human-readable identifier for the reservation category
* **reservation**: BigQuery reservation resource name:
  * Full path: `projects/{project}/locations/{location}/reservations/{name}`
  * `'none'`: for on-demand pricing
  * `null`: Use a default reservation
* **actions**: Array of Dataform action names that are assigned to the reservation

### Usage Examples (Manual Application)

**Note:** These examples are only needed if you're using the manual application approach. With automatic application via `applyAutomaticReservations()`, reservations are applied automatically and you don't need to add these calls to your action files.

#### `publish` actions

* SQLX templates:

```sql
config {
  type: "table",
  schema: "my_schema",
}

pre_operations {
  ${reservations.reservation_setter(ctx)}
}

SELECT * FROM source_table
```

* JavaScript templates:

```javascript
publish('my_table', {
    type: 'table',
    schema: 'my_schema',
}).preOps(ctx => `
${reservations.reservation_setter(ctx)}
`).query(ctx => `
SELECT * FROM source_table
`);
```

#### `operate` actions

* SQLX templates:

```sql
config {
  type: "operations",
}

${reservations.reservation_setter(ctx)}

MERGE target_table T
USING source_table S
ON T.id = S.id
WHEN MATCHED THEN UPDATE SET value = S.value
WHEN NOT MATCHED THEN INSERT (id, value) VALUES (S.id, S.value);
```

* JavaScript templates:

```javascript
operate('my_merge_operation', {
  hasOutput: true,
}).queries(ctx => `
${reservations.reservation_setter(ctx)}

MERGE target_table T
USING source_table S
ON T.id = S.id
WHEN MATCHED THEN UPDATE SET value = S.value
WHEN NOT MATCHED THEN INSERT (id, value) VALUES (S.id, S.value);
`);
```

## API Reference

### `applyAutomaticReservations(config)`

**Primary Method** - Automatically applies reservation configurations to all actions in your Dataform project.

* **Parameters:**
  * `config` (Array): Array of reservation configuration objects
* **Returns:** `void`
* **Usage:** Call once in a definitions file (e.g., `definitions/_reservations.js`)
* **Behavior:** Automatically intercepts all `publish()`, `operate()`, and `assert()` calls and applies appropriate reservations based on action names

### `createReservationSetter(config)`

**Secondary Method** - Creates a reservation setter function for manual application per action.

* **Parameters:**
  * `config` (Array): Array of reservation configuration objects
* **Returns:** `Function` - A setter function that accepts a Dataform context and returns the appropriate `SET @@reservation` SQL statement
* **Usage:** Create in an includes file, then call in individual action files using `${reservation_setter(ctx)}`
* **Use Case:** When you need fine-grained control over which actions get reservations

### `getActionName(ctx)`

**Utility Method** - Extracts the action name from a Dataform context object.

* **Parameters:**
  * `ctx` (Object): Dataform context object
* **Returns:** `string|null` - The action name in format `database.schema.name`, or `null` if not found
* **Usage:** Advanced use cases where you need to programmatically determine action names

## Under the Hood

### Supported Actions

The package supports various Dataform contexts for action name detection:

* **Standard Context**: Uses `ctx.self()` to get the action name.
* **Operation Context**: Falls back to `ctx.operation.proto.target` if `ctx.self()` is not available.

### Reservation Lookup

Actions are matched against the `RESERVATION_CONFIG` using exact string matching. The first matching reservation is applied. If no match is found, the default reservation (first entry with `null` reservation) is used. If no default is defined, no reservation override is applied.

### SQL Generation

Based on the matched reservation, the system generates appropriate SQL:

* **Specific Reservation**: `SET @@reservation='projects/{project}/locations/{location}/reservations/{name}';`
* **On-demand**: `SET @@reservation='none';`
* **Default/Null**: Empty string (no reservation override)
