const {
  createReservationSetter,
  getActionName
} = require('../index')

// Example configuration for testing (previously hardcoded in the plugin)
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

describe('Dataform Reservation Plugin', () => {
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
              name: 'crawl.requests'
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
              name: 'test_table'
            }
          }
        }
      }

      const result = getActionName(ctx)
      expect(result).toBe('test_db.test_table')
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
})
