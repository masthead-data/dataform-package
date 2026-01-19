# Masthead Package for Dataform

![NPM Version](https://img.shields.io/npm/v/%40masthead-data%2Fdataform-package)

## Overview

This package is designed to optimize BigQuery resource usage by automatically assigning compute reservations to Dataform actions based on predefined configuration. This system enables businesses to efficiently manage their BigQuery costs and resource allocation with minimal manual intervention.

## Key Benefits

* **Cost optimization**: Automatically route high-priority workloads to reserved slots and low-priority workloads to on-demand pricing
* **Resource efficiency**: Ensure critical data pipelines get guaranteed compute resources while non-critical tasks use flexible pricing
* **Automated assignement**: Once configured, actions are automatically assigned to reservations based on action categorization
* **Flexible configuration**: Easy adjustment of reservation policies through configuration updates

## Getting Started

### Installation

Add the dependency to your `package.json`:

```json
{
  "dependencies": {
    "@masthead-data/dataform-package": "0.2.0"
  }
}
```

After adding the dependency, click **Install Packages** in Dataform UI.

### Automated Assignment (Recommended)

The easiest way to integrate this package is to use automated actions assignment. Create a configuration file (e.g., `definitions/_reservations.js`) that will assign actions to reservations as specified in your configuration:

```javascript
const { autoAssignActions } = require("@masthead-data/dataform-package");

const RESERVATION_CONFIG = [
  {
    tag: 'editions',
    reservation: 'projects/{project}/locations/{location}/reservations/{name}',
    actions: [
      'project.dataset.table_name',
      'project.dataset.operation_name'
    ]
  },
  {
    tag: 'on_demand',
    reservation: 'none',
    actions: [
      'project.dataset.another_table'
    ]
  }
];

autoAssignActions(RESERVATION_CONFIG);
```

**Note:** If you have many files in the project we recommend to start the filename with an underscore (e.g., `_reservations.js`) to ensure it runs first in the Dataform queue.

With automated assignement, you don't need to edit your individual action files — the package handles everything globally.

### Manual Assignment (Optional)

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

### Usage Examples (Manual Assignment)

**Note:** These examples are only needed if you're using the manual assignment approach. With automatic assignment via `autoAssignActions()`, actions are automatically assigned to reservations and you don't need to edit your action files.

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

### `autoAssignActions(config)`

Automatically intercepts all `publish()`, `operate()`, and `assert()` calls and assigns actions to the appropriate reservations based on action names

* **Parameters:**
  * `config` (Array): Array of reservation configuration objects
* **Returns:** `void`
* **Usage:** Call once in a definitions file (e.g., `definitions/_reservations.js`)

### `createReservationSetter(config)`

Creates a reservation setter function for manual assignment per action when you need fine-grained control over which actions get reservations.

* **Parameters:**
  * `config` (Array): Array of reservation configuration objects
* **Returns:** `Function` - A setter function that accepts a Dataform context and returns the appropriate `SET @@reservation` SQL statement
* **Usage:** Create in an includes file (e.g., `/includes/reservations.js`), then call in individual action files using `${reservations.reservation_setter(ctx)}`

### `getActionName(ctx)`

Extracts the action name from a Dataform context object.

* **Parameters:**
  * `ctx` (Object): Dataform context object
* **Returns:** `string|null` - The action name in format `database.schema.name`, or `null` if not found

## Compatibility

This package is tested and compatible with:

* **Dataform v2.4.2** (v2.x series)
* **Dataform v3.0.42** (v3.x series)

## Under the Hood

### Supported Actions

The package supports various Dataform contexts for action name detection:

* **Standard Context**: Uses `ctx.self()` to get the action name.
* **Operation Context**: Falls back to `ctx.operation.proto.target` if `ctx.self()` is not available.

### Reservation Lookup

Actions are matched against the `RESERVATION_CONFIG` using exact string matching. The action is assigned to the first matching reservation. If no match is found, the actions is assigned to the default reservation (first entry with `null` reservation). If no default is defined, no reservation override is applied.

### SQL Generation

Based on the matched reservation, the system generates appropriate SQL:

* **Specific Reservation**: `SET @@reservation='projects/{project}/locations/{location}/reservations/{name}';`
* **On-demand**: `SET @@reservation='none';`
* **Default/Null**: Empty string (no reservation override)

### Limitations

**Validation:** No format validation for reservation strings - relies on BigQuery errors
**Duplicate Detection:** No check if user manually added `SET @@reservation` statements
**Schema auto-detection:** Config requires explicit `database.schema.action` format - no automatic project/dataset inference
