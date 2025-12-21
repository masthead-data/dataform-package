# Masthead Package for Dataform

![NPM Version](https://img.shields.io/npm/v/%40masthead-data%2Fdataform-package)

## Overview

This package is designed to optimize BigQuery resource usage by automatically assigning compute reservations to Dataform actions based on predefined configuration. This system enables businesses to efficiently manage their BigQuery costs and resource allocation with minimal manual intervention.

## Key Benefits

* **Cost optimization**: Automatically route high-priority workloads to reserved slots and low-priority workloads to on-demand pricing
* **Resource efficiency**: Ensure critical data pipelines get guaranteed compute resources while non-critical tasks use flexible pricing
* **Automated re-assignement**: Once configured, reservations are applied automatically based on action categorization
* **Flexible configuration**: Easy adjustment of reservation policies through configuration updates

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

Then, import the package and create a setter function in your global scope under `/includes` directory:

```javascript
const reservations = require("@masthead-data/dataform-package");

const RESERVATION_CONFIG = [
  ...
];

// Option 1: Manual Application (per file)
const reservation_setter = reservations.createReservationSetter(RESERVATION_CONFIG);

module.exports = {
  ...
  reservation_setter
}

// Option 2: Automatic Application (Global)
// Place this in a new file, e.g., `definitions/reservations.js`
reservations.applyAutomaticReservations(RESERVATION_CONFIG);
```

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

### Usage examples

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

Example implementation can be found in [https://github.com/HTTPArchive/dataform](https://github.com/HTTPArchive/dataform).

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
