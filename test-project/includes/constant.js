/**
 * Reservation configuration for the test project
 * This file defines which actions should use which BigQuery reservations
 */

const { createReservationSetter } = require('@masthead-data/dataform-package')

const RESERVATION_CONFIG = [
  {
    tag: 'production_critical',
    reservation: 'projects/my-test-project/locations/US/reservations/production',
    actions: [
      'masthead-data.test.critical_dashboard',
      'masthead-data.test.realtime_metrics'
    ]
  },
  {
    tag: 'development',
    reservation: 'none',
    actions: [
      'masthead-data.test.experimental_table',
      'masthead-data.test.test_queries'
    ]
  },
  {
    tag: 'batch_processing',
    reservation: 'projects/my-test-project/locations/US/reservations/batch',
    actions: [
      'masthead-data.test.large_data_processing',
      'masthead-data.test.monthly_aggregation'
    ]
  },
  {
    tag: 'default',
    reservation: null,
    actions: []
  }
]

const setReservation = createReservationSetter(RESERVATION_CONFIG)

module.exports = { setReservation }
