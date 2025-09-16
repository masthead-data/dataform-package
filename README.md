# Masthead Plugin for Dataform

## Overview

This plugin is designed to optimize BigQuery resource usage by automatically assigning compute reservations to Dataform actions based on predefined configuration. This system enables businesses to efficiently manage their BigQuery costs and resource allocation with minimal manual intervention.

## Key Benefits

* **Cost optimization**: Automatically route high-priority workloads to reserved slots and low-priority workloads to on-demand pricing
* **Resource efficiency**: Ensure critical data pipelines get guaranteed compute resources while non-critical tasks use flexible pricing
* **Automated re-assignement**: Once configured, reservations are applied automatically based on action categorization
* **Flexible configuration**: Easy adjustment of reservation policies through configuration updates

## Usage in Dataform

### `publish` actions

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

### `operate` actions

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

## How It Works

### 0\. Initial Setup

Add the dependency to your `package.json`:

```json
{
  "dependencies": {
    "@masthead-data/dataform-plugin": "0.0.1"
  }
}
```

and create a setter function in your included JavaScript file:

```javascript
const reservations = require("dataform-plugin");

const RESERVATION_CONFIG = [
  ...
];

function reservation_setter = reservations.createReservationSetter(RESERVATION_CONFIG);

module.exports = {
  ...
  reservation_setter
}
```

### 1\. Configuration Structure

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

Configuration parameters:

* **tag**: Human-readable identifier for the reservation category
* **reservation**: BigQuery reservation path:
  * Full path: `projects/{project}/locations/{location}/reservations/{name}`
  * `null`: Use default reservation (if any)
  * `'none'`: for on-demand pricing
* **actions**: Array of Dataform action names that should use this reservation

### 2\. Action Name Detection

The system automatically detects the current Dataform action using two methods:

* **Primary**: `ctx.self()` function (for most Dataform contexts)
* **Fallback**: `ctx.operation.proto.target` (for operation contexts)

### 3\. Reservation Lookup

Actions are matched against the `RESERVATION_CONFIG` using exact string matching. The first matching reservation is applied. If no match is found, the default reservation (first entry with `null` reservation) is used. If no default is defined, no reservation override is applied.

### 4\. SQL Generation

Based on the matched reservation, the system generates appropriate SQL:

* **Specific Reservation**: `SET @@reservation='projects/{project}/locations/{location}/reservations/{name}';`
* **On-demand**: `SET @@reservation='none';`
* **Default/Null**: Empty string (no reservation override)

## Configuration management by Masthead

Masthead Data app provides the `RESERVATION_CONFIG` object with action categorization, example:

* **High Priority Actions**: Critical business data pipelines, real-time dashboards
* **Medium Priority Actions**: Regular ETL jobs, daily reports
* **Low Priority Actions**: Data exploration, ad-hoc analysis
* **On-demand Actions**: Experimental queries, one-time data loads

You can review it regularly manually or develop an automated process using [programmatic insights access](https://docs.mastheadata.com/masthead-api/overview).
[The recommended pipeline model](https://docs.mastheadata.com/cost-insights/compute-costs#model-for-a-pipeline) is estimated based on:

* **Usage Patterns**: Historical query performance and frequency
* **Cost Analysis**: BigQuery slot usage and billing data
* **Resource Availability**: Current reservation capacity and utilization
* **~~Business Priority~~**~~: Changing business requirements and SLAs~~

## Best Practices

### 1\. Reservation strategy

* **High-Slots**: Use for big data volume operations
* **Low-Slots**: Use for standard ETL processes with flexible timing
* **On-Demand**: Use for computation-intensive operations

### 2\. Monitoring and optimization

* Monitor BigQuery job performance and costs
* Regularly review action categorization in [Compute cost insights](https://app.mastheadata.com/costs?tab=Compute+costs)
* Adjust reservation allocation based on usage patterns

## Error Handling

The system includes robust error handling:

* **Missing Context**: Returns empty string (no reservation override)
* **Invalid Action Names**: Falls back to default reservation
* **Malformed Configuration**: Graceful degradation to default behavior

## Performance Considerations

* **Minimal Overhead**: Configuration lookup uses efficient Set-based matching
* **Lazy Evaluation**: Reservation SQL only generated when needed
* **Memory Efficient**: Configuration processed once at module load

## Maintenance and support

For questions or issues with dynamic reservation optimization:

1. Check Dataform compilation results for errors
2. Verify action names match exactly in configuration
3. Monitor BigQuery job details for reservation assignment
4. Contact Masthead support for configuration optimization
