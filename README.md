# Masthead Plugin for Dataform

[![npm version](https://badge.fury.io/js/%40masthead-data%2Fdataform-plugin.svg)](https://badge.fury.io/js/%40masthead-data%2Fdataform-plugin)

## Overview

This plugin is designed to optimize BigQuery resource usage by automatically assigning compute reservations to Dataform actions based on predefined configuration. This system enables businesses to efficiently manage their BigQuery costs and resource allocation with minimal manual intervention.

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
    "@masthead-data/dataform-plugin": "0.0.2"
  }
}
```

and click **Install Packages** in Dataform UI.

Then, import the plugin and create a setter function in your global scope under `/includes` directory:

```javascript
const reservations = require("@masthead-data/dataform-plugin");

const RESERVATION_CONFIG = [
  ...
];

const reservation_setter = reservations.createReservationSetter(RESERVATION_CONFIG);

module.exports = {
  ...
  reservation_setter
}
```

### Configuration Structure

Configuration object defining reservation policies:

```javascript
const RESERVATION_CONFIG = [
  {
    tag: 'high_slots',
    reservation: 'projects/{project}/locations/{location}/reservations/{name}',
    actions: [
      'project.dataset.table'
    ]
  },
  {
    tag: 'low_slots',
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

### Action Name Detection

The plugin detects the action using two methods:

* **Primary**: `ctx.self()` function (for most Dataform contexts)
* **Fallback**: `ctx.operation.proto.target` (for operation contexts)

### Reservation Lookup

Actions are matched against the `RESERVATION_CONFIG` using exact string matching. The first matching reservation is applied. If no match is found, the default reservation (first entry with `null` reservation) is used. If no default is defined, no reservation override is applied.

### SQL Generation

Based on the matched reservation, the system generates appropriate SQL:

* **Specific Reservation**: `SET @@reservation='projects/{project}/locations/{location}/reservations/{name}';`
* **On-demand**: `SET @@reservation='none';`
* **Default/Null**: Empty string (no reservation override)
