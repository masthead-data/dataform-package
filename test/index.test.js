const {
  createReservationSetter,
  getActionName,
  autoAssignActions
} = require('../index')

/**
 * TEST NAMING GUIDELINE
 *
 * Use descriptive semantic names highlighting environment and purpose:
 * - Environment prefix: prod, dev, staging (reflects the business context)
 * - Dataset: public_analytics, data_mart, assertions, staging (describes domain)
 * - Table/action: pages, requests, quality_check (specific dataset contents)
 *
 * Format: {environment}.{dataset}.{table}
 * Example: prod.public_analytics.pages, prod.data_mart.requests_latest
 *
 * Benefits: Tests are self-documenting, easier to extend, and reflect real-world patterns.
 */

// Example configuration for testing
// Naming guideline: Use descriptive semantic names reflecting environment/purpose
// - Environment prefix: prod, dev, staging
// - Dataset describes the business domain: public_analytics, data_mart, assertions, staging
// - Table/action names describe the dataset contents: pages, requests, quality_check, temp_dataset
const EXAMPLE_RESERVATION_CONFIG = [
  {
    tag: 'prod_reserved',
    reservation: 'projects/my-project/locations/us/reservations/prod',
    actions: [
      'prod.public_analytics.pages',
      'prod.public_analytics.requests',
      'prod.public_analytics.parsed_css',
      'prod.data_mart.pages_latest',
      'prod.data_mart.requests_latest'
    ]
  },
  {
    tag: 'dev_reserved',
    reservation: null,
    actions: []
  },
  {
    tag: 'ondemand_pricing',
    reservation: 'none',
    actions: [
      'prod.assertions.data_quality_check',
      'prod.staging.temp_dataset'
    ]
  }
]

describe('Dataform package', () => {
  // Create a reservation setter using the example config for testing
  const reservation_setter = createReservationSetter(EXAMPLE_RESERVATION_CONFIG)

  describe('reservation setter function (from createReservationSetter)', () => {
    test('should return reservation SQL for prod_reserved action', () => {
      const ctx = {
        self: () => 'prod.public_analytics.pages'
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('SET @@reservation=\'projects/my-project/locations/us/reservations/prod\';')
    })

    test('should return empty string for dev_reserved action', () => {
      const ctx = {
        self: () => 'some.unknown.action'
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('')
    })

    test('should return none reservation for ondemand_pricing action', () => {
      const ctx = {
        self: () => 'prod.assertions.data_quality_check'
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('SET @@reservation=\'none\';')
    })

    test('should handle fallback method with proto target', () => {
      const ctx = {
        operation: {
          proto: {
            target: {
              database: 'prod',
              schema: 'public_analytics',
              name: 'requests'
            }
          }
        }
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('SET @@reservation=\'projects/my-project/locations/us/reservations/prod\';')
    })

    test('should throw error when invalid config is provided to createReservationSetter', () => {
      expect(() => createReservationSetter()).toThrow('Configuration must be a non-empty array')
      expect(() => createReservationSetter(null)).toThrow('Configuration must be a non-empty array')
      expect(() => createReservationSetter('invalid')).toThrow('Configuration must be a non-empty array')
      expect(() => createReservationSetter([])).toThrow('Configuration array cannot be empty')
    })

    test('should validate configuration object structure', () => {
      expect(() => createReservationSetter([null])).toThrow('Configuration item at index 0 must be an object')
      expect(() => createReservationSetter([{}])).toThrow('Configuration item at index 0 is missing \'reservation\' property')
      expect(() => createReservationSetter([{ reservation: 'test' }])).toThrow('Configuration item at index 0 must have \'actions\' as an array')
      expect(() => createReservationSetter([{ reservation: 'test', actions: 'not-array' }])).toThrow('Configuration item at index 0 must have \'actions\' as an array')
    })

    test('should return empty string for null context', () => {
      const result = reservation_setter(null)
      expect(result).toBe('')
    })

    test('should return empty string for undefined context', () => {
      const result = reservation_setter(undefined)
      expect(result).toBe('')
    })

    test('should handle context with self function returning null', () => {
      const ctx = {
        self: () => null
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('')
    })

    test('should handle context with self function returning empty string', () => {
      const ctx = {
        self: () => ''
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('')
    })

    test('should strip backticks from action name', () => {
      const ctx = {
        self: () => '`prod.public_analytics.pages`'
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('SET @@reservation=\'projects/my-project/locations/us/reservations/prod\';')
    })

    test('should handle malformed proto target', () => {
      const ctx = {
        operation: {
          proto: {
            target: null
          }
        }
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('')
    })
  })

  describe('getActionName', () => {
    test('should extract action name from ctx.self()', () => {
      const ctx = {
        self: () => 'test.action.name'
      }

      const result = getActionName(ctx)
      expect(result).toBe('test.action.name')
    })

    test('should extract action name from proto target', () => {
      const ctx = {
        operation: {
          proto: {
            target: {
              database: 'test_db',
              schema: 'test_schema',
              name: 'test_table'
            }
          }
        }
      }

      const result = getActionName(ctx)
      expect(result).toBe('test_db.test_schema.test_table')
    })

    test('should return null for invalid context', () => {
      expect(getActionName(null)).toBe(null)
      expect(getActionName({})).toBe(null)
    })
  })

  describe('createReservationSetter', () => {
    test('should create custom reservation setter', () => {
      const customConfig = [
        {
          tag: 'custom',
          reservation: 'projects/test/reservations/custom',
          actions: ['test.custom.action']
        }
      ]

      const customSetter = createReservationSetter(customConfig)
      const ctx = {
        self: () => 'test.custom.action'
      }

      const result = customSetter(ctx)
      expect(result).toBe('SET @@reservation=\'projects/test/reservations/custom\';')
    })

    test('should return empty string for unknown action in custom config', () => {
      const customConfig = [
        {
          tag: 'custom',
          reservation: 'projects/test/reservations/custom',
          actions: ['test.custom.action']
        }
      ]

      const customSetter = createReservationSetter(customConfig)
      const ctx = {
        self: () => 'unknown.action'
      }

      const result = customSetter(ctx)
      expect(result).toBe('')
    })
  })

  describe('EXAMPLE_RESERVATION_CONFIG', () => {
    test('should export example reservation config for testing', () => {
      expect(EXAMPLE_RESERVATION_CONFIG).toBeDefined()
      expect(Array.isArray(EXAMPLE_RESERVATION_CONFIG)).toBe(true)
      expect(EXAMPLE_RESERVATION_CONFIG.length).toBeGreaterThan(0)
    })

    test('should have required properties in config', () => {
      EXAMPLE_RESERVATION_CONFIG.forEach(config => {
        expect(config).toHaveProperty('tag')
        expect(config).toHaveProperty('reservation')
        expect(config).toHaveProperty('actions')
        expect(Array.isArray(config.actions)).toBe(true)
      })
    })
  })

  describe('autoAssignActions', () => {
    let originalPublish
    let originalOperate
    let originalAssert
    let originalDataform

    beforeEach(() => {
      // Save original global state
      originalPublish = global.publish
      originalOperate = global.operate
      originalAssert = global.assert
      originalDataform = global.dataform

      // Reset global state
      global.dataform = {
        actions: [],
        projectConfig: {
          defaultDatabase: 'test-project',
          defaultSchema: 'test-schema',
          defaultLocation: 'US'
        }
      }

      // Mock global functions
      global.publish = jest.fn((name, config) => {
        const action = {
          proto: {
            type: config?.type || 'table',
            target: {
              name,
              database: 'test-project',
              schema: config?.schema || 'test-schema'
            }
          },
          preOps: jest.fn(),
          contextablePreOps: []
        }
        global.dataform.actions.push(action)
        return action
      })

      global.operate = jest.fn((name, config) => {
        const action = {
          proto: {
            queries: [],
            target: {
              name,
              database: 'test-project',
              schema: config?.schema || 'test-schema'
            }
          },
          queries: jest.fn(function (q) {
            this.proto.queries = Array.isArray(q) ? q : [q]
            return this
          }),
          contextableQueries: []
        }
        global.dataform.actions.push(action)
        return action
      })

      global.assert = jest.fn((name) => {
        const action = {
          proto: {
            type: 'assertion',
            target: {
              name,
              database: 'test-project',
              schema: 'test-schema'
            }
          }
        }
        global.dataform.actions.push(action)
        return action
      })
    })

    afterEach(() => {
      // Restore original global state
      global.publish = originalPublish
      global.operate = originalOperate
      global.assert = originalAssert
      global.dataform = originalDataform
    })

    test('should apply reservations to existing publish actions', () => {
      // Create actions before calling autoAssignActions
      global.publish('test_table', { type: 'table' })

      const config = [
        {
          tag: 'test',
          reservation: 'projects/test/locations/US/reservations/prod',
          actions: ['test-project.test-schema.test_table']
        }
      ]

      autoAssignActions(config)

      const action = global.dataform.actions[0]
      expect(action.contextablePreOps).toContain('SET @@reservation=\'projects/test/locations/US/reservations/prod\';')
    })

    test('should intercept new publish actions after initialization', () => {
      const config = [
        {
          tag: 'test',
          reservation: 'projects/test/locations/US/reservations/prod',
          actions: ['test-project.test-schema.new_table']
        }
      ]

      autoAssignActions(config)

      // Create action AFTER autoAssignActions
      global.publish('new_table', { type: 'table' })

      const action = global.dataform.actions[0]
      expect(action.contextablePreOps).toContain('SET @@reservation=\'projects/test/locations/US/reservations/prod\';')
    })

    test('should apply reservations to operations', () => {
      const config = [
        {
          tag: 'test',
          reservation: 'projects/test/locations/US/reservations/prod',
          actions: ['test-project.test-schema.test_operation']
        }
      ]

      autoAssignActions(config)
      global.operate('test_operation').queries('SELECT 1')

      const action = global.dataform.actions[0]
      expect(action.proto.queries[0]).toBe('SET @@reservation=\'projects/test/locations/US/reservations/prod\';')
    })

    test('should apply "none" reservation for on-demand pricing', () => {
      const config = [
        {
          tag: 'on-demand',
          reservation: 'none',
          actions: ['test-project.test-schema.ondemand_table']
        }
      ]

      autoAssignActions(config)
      global.publish('ondemand_table', { type: 'table' })

      const action = global.dataform.actions[0]
      expect(action.contextablePreOps).toContain('SET @@reservation=\'none\';')
    })

    test('should skip assertions', () => {
      const config = [
        {
          tag: 'test',
          reservation: 'projects/test/locations/US/reservations/prod',
          actions: ['test-project.test-schema.test_assertion']
        }
      ]

      autoAssignActions(config)
      global.assert('test_assertion')

      const action = global.dataform.actions[0]
      expect(action.contextablePreOps).toBeUndefined()
      expect(action.proto.preOps).toBeUndefined()
    })

    test('should not apply reservation to unmatched actions', () => {
      const config = [
        {
          tag: 'test',
          reservation: 'projects/test/locations/US/reservations/prod',
          actions: ['test-project.test-schema.matched_table']
        }
      ]

      autoAssignActions(config)
      global.publish('unmatched_table', { type: 'table' })

      const action = global.dataform.actions[0]
      expect(action.contextablePreOps).toHaveLength(0)
    })

    test('should handle multiple actions with different reservations', () => {
      const config = [
        {
          tag: 'prod',
          reservation: 'projects/test/locations/US/reservations/prod',
          actions: ['test-project.test-schema.prod_table']
        },
        {
          tag: 'dev',
          reservation: 'none',
          actions: ['test-project.test-schema.dev_table']
        }
      ]

      autoAssignActions(config)
      global.publish('prod_table', { type: 'table' })
      global.publish('dev_table', { type: 'table' })

      expect(global.dataform.actions[0].contextablePreOps).toContain('SET @@reservation=\'projects/test/locations/US/reservations/prod\';')
      expect(global.dataform.actions[1].contextablePreOps).toContain('SET @@reservation=\'none\';')
    })

    test('should throw error with invalid config', () => {
      expect(() => autoAssignActions()).toThrow('Configuration must be a non-empty array')
      expect(() => autoAssignActions(null)).toThrow('Configuration must be a non-empty array')
      expect(() => autoAssignActions([])).toThrow('Configuration array cannot be empty')
    })

    test('should prepend reservation before existing preOps', () => {
      global.publish('test_table', { type: 'table' })
      const action = global.dataform.actions[0]
      action.contextablePreOps = ['DECLARE x INT64 DEFAULT 1;']

      const config = [
        {
          tag: 'test',
          reservation: 'projects/test/locations/US/reservations/prod',
          actions: ['test-project.test-schema.test_table']
        }
      ]

      autoAssignActions(config)

      expect(action.contextablePreOps[0]).toBe('SET @@reservation=\'projects/test/locations/US/reservations/prod\';')
      expect(action.contextablePreOps[1]).toBe('DECLARE x INT64 DEFAULT 1;')
    })

    test('should not duplicate reservation if already applied', () => {
      const config = [
        {
          tag: 'test',
          reservation: 'projects/test/locations/US/reservations/prod',
          actions: ['test-project.test-schema.test_table']
        }
      ]

      autoAssignActions(config)
      global.publish('test_table', { type: 'table' })

      // Apply again (simulating multiple calls)
      autoAssignActions(config)

      const action = global.dataform.actions[0]
      const reservationCount = action.contextablePreOps.filter(op =>
        op.includes('SET @@reservation')
      ).length
      expect(reservationCount).toBe(1)
    })
  })

  describe('prependStatement', () => {
    test('should prepend statement to array', () => {
      const { prependStatement } = require('../index')
      const result = prependStatement(['query2'], 'query1')
      expect(result).toEqual(['query1', 'query2'])
    })

    test('should not duplicate statement in array', () => {
      const { prependStatement } = require('../index')
      const result = prependStatement(['query1', 'query2'], 'query1')
      expect(result).toEqual(['query1', 'query2'])
    })

    test('should prepend statement to string', () => {
      const { prependStatement } = require('../index')
      const result = prependStatement('SELECT * FROM table', 'SET @var=1;')
      expect(result).toEqual(['SET @var=1;', 'SELECT * FROM table'])
    })

    test('should not duplicate statement in string', () => {
      const { prependStatement } = require('../index')
      const duplicate = 'SET @var=1;\nSELECT * FROM table'
      const result = prependStatement(duplicate, 'SET @var=1;')
      expect(result).toBe(duplicate)
    })

    test('should handle empty array', () => {
      const { prependStatement } = require('../index')
      const result = prependStatement([], 'statement')
      expect(result).toEqual(['statement'])
    })

    test('should handle empty string', () => {
      const { prependStatement } = require('../index')
      const result = prependStatement('', 'statement')
      expect(result).toEqual(['statement', ''])
    })
  })

  describe('isArrayOrString', () => {
    test('should return true for array', () => {
      const { isArrayOrString } = require('../index')
      expect(isArrayOrString([])).toBe(true)
      expect(isArrayOrString(['item'])).toBe(true)
    })

    test('should return true for string', () => {
      const { isArrayOrString } = require('../index')
      expect(isArrayOrString('')).toBe(true)
      expect(isArrayOrString('test')).toBe(true)
    })

    test('should return false for other types', () => {
      const { isArrayOrString } = require('../index')
      expect(isArrayOrString(null)).toBe(false)
      expect(isArrayOrString(undefined)).toBe(false)
      expect(isArrayOrString(123)).toBe(false)
      expect(isArrayOrString({})).toBe(false)
      expect(isArrayOrString(() => {})).toBe(false)
    })
  })

  describe('findReservation', () => {
    test('should find reservation for matching action', () => {
      const { findReservation } = require('../index')
      const actionToReservation = new Map([
        ['prod.dataset.table', 'projects/test/reservations/prod']
      ])
      const result = findReservation('prod.dataset.table', actionToReservation)
      expect(result).toBe('projects/test/reservations/prod')
    })

    test('should return null for non-matching action', () => {
      const { findReservation } = require('../index')
      const actionToReservation = new Map([
        ['prod.dataset.table', 'projects/test/reservations/prod']
      ])
      const result = findReservation('unknown.dataset.table', actionToReservation)
      expect(result).toBeNull()
    })

    test('should handle multiple config sets', () => {
      const { findReservation } = require('../index')
      const actionToReservation = new Map([
        ['prod.dataset.table', 'prod-res'],
        ['dev.dataset.table', 'dev-res']
      ])
      expect(findReservation('prod.dataset.table', actionToReservation)).toBe('prod-res')
      expect(findReservation('dev.dataset.table', actionToReservation)).toBe('dev-res')
    })

    test('should return null for null/undefined action name', () => {
      const { findReservation } = require('../index')
      const actionToReservation = new Map([['test', 'res']])
      expect(findReservation(null, actionToReservation)).toBeNull()
      expect(findReservation(undefined, actionToReservation)).toBeNull()
    })

    test('should return null for non-string action name', () => {
      const { findReservation } = require('../index')
      const actionToReservation = new Map([['test', 'res']])
      expect(findReservation(123, actionToReservation)).toBeNull()
      expect(findReservation({}, actionToReservation)).toBeNull()
    })
  })
})
