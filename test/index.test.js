const {
  createReservationSetter,
  getActionName,
  autoAssignActions
} = require('../index')

// Example configuration for testing (previously hardcoded in the package)
const EXAMPLE_RESERVATION_CONFIG = [
  {
    tag: 'high_slots',
    reservation: 'projects/httparchive/locations/US/reservations/pipeline',
    actions: [
      'httparchive.crawl.pages',
      'httparchive.crawl.requests',
      'httparchive.crawl.parsed_css',
      'httparchive.f1.pages_latest',
      'httparchive.f1.requests_latest'
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
      'httparchive.dataform_assertions.corrupted_technology_values',
      'httparchive.scratchspace.new'
    ]
  }
]

describe('Dataform package', () => {
  // Create a reservation setter using the example config for testing
  const reservation_setter = createReservationSetter(EXAMPLE_RESERVATION_CONFIG)

  describe('reservation setter function (from createReservationSetter)', () => {
    test('should return reservation SQL for high_slots action', () => {
      const ctx = {
        self: () => 'httparchive.crawl.pages'
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('SET @@reservation=\'projects/httparchive/locations/US/reservations/pipeline\';')
    })

    test('should return empty string for low_slots action', () => {
      const ctx = {
        self: () => 'some.unknown.action'
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('')
    })

    test('should return none reservation for on_demand action', () => {
      const ctx = {
        self: () => 'httparchive.dataform_assertions.corrupted_technology_values'
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('SET @@reservation=\'none\';')
    })

    test('should handle fallback method with proto target', () => {
      const ctx = {
        operation: {
          proto: {
            target: {
              database: 'httparchive',
              schema: 'crawl',
              name: 'requests'
            }
          }
        }
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('SET @@reservation=\'projects/httparchive/locations/US/reservations/pipeline\';')
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
        self: () => '`httparchive.crawl.pages`'
      }

      const result = reservation_setter(ctx)
      expect(result).toBe('SET @@reservation=\'projects/httparchive/locations/US/reservations/pipeline\';')
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
})
