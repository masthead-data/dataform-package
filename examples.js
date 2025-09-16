/**
 * Example usage of the Dataform Reservation Plugin
 * This file demonstrates various ways to use the plugin in your Dataform project
 */

const { createReservationSetter } = require('@masthead-data/dataform-reservation-plugin')

// Example 1: Define your reservation configuration
const MY_RESERVATION_CONFIG = [
  {
    tag: 'production_critical',
    reservation: 'projects/my-company/locations/US/reservations/production',
    actions: [
      'my_project.critical_reports.daily_dashboard',
      'my_project.critical_reports.realtime_metrics'
    ]
  },
  {
    tag: 'development',
    reservation: 'none', // Use on-demand pricing for development
    actions: [
      'my_project.dev.experimental_table',
      'my_project.dev.test_queries'
    ]
  },
  {
    tag: 'batch_processing',
    reservation: 'projects/my-company/locations/US/reservations/batch',
    actions: [
      'my_project.etl.large_data_processing',
      'my_project.etl.monthly_aggregation'
    ]
  },
  {
    tag: 'default',
    reservation: null, // Use default reservation (if any)
    actions: []
  }
]

// Example 2: Create your reservation setter function
const reservation_setter = createReservationSetter(MY_RESERVATION_CONFIG)

// Example 3: Usage in Dataform SQLX files
// Place this in your pre_operations block:

/*
config {
  type: "table",
  schema: "my_schema",
}

pre_operations {
  ${reservation_setter(ctx)}
}

SELECT * FROM source_table
*/

// Example 4: Usage in JavaScript Dataform files

/*
const { createReservationSetter } = require('@masthead-data/dataform-reservation-plugin')

const MY_CONFIG = [
  // your configuration here
]

const reservation_setter = createReservationSetter(MY_CONFIG)

publish('my_table', {
    type: 'table',
    schema: 'my_schema',
}).preOps(ctx => `
${reservation_setter(ctx)}
`).query(ctx => `
SELECT * FROM source_table
`)
*/

// Example 5: Multiple reservation setters for different environments
const productionReservationSetter = createReservationSetter([
  {
    tag: 'production',
    reservation: 'projects/my-company/locations/US/reservations/production',
    actions: ['my_project.prod.*']
  }
])

const developmentReservationSetter = createReservationSetter([
  {
    tag: 'development',
    reservation: 'none',
    actions: ['my_project.dev.*']
  }
])

// Example 6: Conditional reservation assignment
function getReservationSetter(environment) {
  if (environment === 'production') {
    return productionReservationSetter
  }
  return developmentReservationSetter
}

// Example 7: Logging and monitoring
function reservationSetterWithLogging(ctx) {
  const reservationSQL = reservation_setter(ctx)

  // Log the reservation assignment for monitoring
  if (reservationSQL) {
    console.log(`Assigned reservation for action: ${ctx.self ? ctx.self() : 'unknown'}`)
  }

  return reservationSQL
}

module.exports = {
  MY_RESERVATION_CONFIG,
  reservation_setter,
  productionReservationSetter,
  developmentReservationSetter,
  getReservationSetter,
  reservationSetterWithLogging
}
