const { autoAssignActions } = require('../index')

describe('Compiled Objects and Edge Cases', () => {
  let originalDataform

  beforeEach(() => {
    // Save original global state
    originalDataform = global.dataform

    // Reset global state
    global.dataform = {
      actions: [],
      projectConfig: {
        defaultDatabase: 'test-project',
        defaultSchema: 'test-schema'
      }
    }
  })

  afterEach(() => {
    // Restore original global state
    global.dataform = originalDataform
  })

  const config = [
    {
      tag: 'test',
      reservation: 'projects/test/locations/US/reservations/prod',
      actions: ['test-project.test-schema.target_action']
    }
  ]

  test('should apply reservation to compiled object via proto.preOps (array)', () => {
    const action = {
      type: 'table',
      target: {
        database: 'test-project',
        schema: 'test-schema',
        name: 'target_action'
      },
      preOps: [] // This will be treated as proto.preOps because action.proto is undefined
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    expect(action.preOps).toContain("SET @@reservation='projects/test/locations/US/reservations/prod';")
  })

  test('should initialize proto.preOps if it does not exist', () => {
    const action = {
      type: 'table',
      target: {
        database: 'test-project',
        schema: 'test-schema',
        name: 'target_action'
      }
      // preOps is missing
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    expect(action.preOps).toBeDefined()
    expect(Array.isArray(action.preOps)).toBe(true)
    expect(action.preOps).toContain("SET @@reservation='projects/test/locations/US/reservations/prod';")
  })

  test('should handle proto.preOps as a string', () => {
    const action = {
      type: 'table',
      target: {
        database: 'test-project',
        schema: 'test-schema',
        name: 'target_action'
      },
      preOps: 'SELECT 1;'
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    expect(Array.isArray(action.preOps)).toBe(true)
    expect(action.preOps[0]).toBe("SET @@reservation='projects/test/locations/US/reservations/prod';")
    expect(action.preOps[1]).toBe('SELECT 1;')
  })

  test('should apply reservation to compiled operation via proto.queries (array)', () => {
    const action = {
      queries: ['SELECT * FROM table'],
      target: {
        database: 'test-project',
        schema: 'test-schema',
        name: 'target_action'
      }
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    expect(action.queries).toContain("SET @@reservation='projects/test/locations/US/reservations/prod';")
    expect(action.queries[0]).toBe("SET @@reservation='projects/test/locations/US/reservations/prod';")
  })

  test('should handle proto.queries as a string', () => {
    const action = {
      queries: 'SELECT * FROM table',
      target: {
        database: 'test-project',
        schema: 'test-schema',
        name: 'target_action'
      }
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    expect(Array.isArray(action.queries)).toBe(true)
    expect(action.queries[0]).toBe("SET @@reservation='projects/test/locations/US/reservations/prod';")
    expect(action.queries[1]).toBe('SELECT * FROM table')
  })

  test('should fallback to action.preOps() function if hasType is true but proto.preOps is not an array/string', () => {
    const preOpsMock = jest.fn()
    const action = {
      type: 'table',
      target: {
        database: 'test-project',
        schema: 'test-schema',
        name: 'target_action'
      },
      preOps: preOpsMock // This is a function
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    expect(preOpsMock).toHaveBeenCalledWith("SET @@reservation='projects/test/locations/US/reservations/prod';")
  })

  test('should fallback to action.preOps() function if no other method matches (Fallback 5)', () => {
    const preOpsMock = jest.fn()
    const action = {
      // No type, no queries, no contextable fields
      target: {
        database: 'test-project',
        schema: 'test-schema',
        name: 'target_action'
      },
      preOps: preOpsMock
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    expect(preOpsMock).toHaveBeenCalledWith("SET @@reservation='projects/test/locations/US/reservations/prod';")
  })

  test('should handle contextableQueries as a string', () => {
    const action = {
      contextableQueries: 'SELECT 1',
      target: {
        database: 'test-project',
        schema: 'test-schema',
        name: 'target_action'
      }
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    expect(Array.isArray(action.contextableQueries)).toBe(true)
    expect(action.contextableQueries[0]).toBe("SET @@reservation='projects/test/locations/US/reservations/prod';")
  })

  test('should handle contextablePreOps as a string', () => {
    const action = {
      type: 'table',
      contextablePreOps: 'SELECT 1',
      target: {
        database: 'test-project',
        schema: 'test-schema',
        name: 'target_action'
      }
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    expect(Array.isArray(action.contextablePreOps)).toBe(true)
    expect(action.contextablePreOps[0]).toBe("SET @@reservation='projects/test/locations/US/reservations/prod';")
  })

  test('should handle monkeypatched queries with function returning string', () => {
    const action = {
      queries: function(q) { this.resolvedQueries = q; return this; },
      proto: {
        queries: [],
        target: { database: 'test-project', schema: 'test-schema', name: 'target_action' }
      }
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    // Trigger the monkeypatched queries function
    const queryFn = (ctx) => 'SELECT 1'
    action.queries(queryFn)

    // The monkeypatch should have wrapped the function
    const wrappedFn = action.resolvedQueries
    expect(typeof wrappedFn).toBe('function')

    const result = wrappedFn({})
    expect(result).toContain("SET @@reservation='projects/test/locations/US/reservations/prod';")
    expect(result).toContain('SELECT 1')
  })

  test('should handle monkeypatched queries with function returning array', () => {
    const action = {
      queries: function(q) { this.resolvedQueries = q; return this; },
      proto: {
        queries: [],
        target: { database: 'test-project', schema: 'test-schema', name: 'target_action' }
      }
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    const queryFn = (ctx) => ['SELECT 1', 'SELECT 2']
    action.queries(queryFn)

    const wrappedFn = action.resolvedQueries
    const result = wrappedFn({})
    expect(result[0]).toBe("SET @@reservation='projects/test/locations/US/reservations/prod';")
    expect(result).toHaveLength(3)
  })

  test('should handle monkeypatched queries with function returning other types', () => {
    const action = {
      queries: function(q) { this.resolvedQueries = q; return this; },
      proto: {
        queries: [],
        target: { database: 'test-project', schema: 'test-schema', name: 'target_action' }
      }
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    const queryFn = (ctx) => null
    action.queries(queryFn)

    const wrappedFn = action.resolvedQueries
    const result = wrappedFn({})
    expect(result).toBe(null)
  })

  test('should handle monkeypatched queries with array', () => {
    const action = {
      queries: function(q) { this.resolvedQueries = q; return this; },
      proto: {
        queries: [],
        target: { database: 'test-project', schema: 'test-schema', name: 'target_action' }
      }
    }
    global.dataform.actions.push(action)

    autoAssignActions(config)

    action.queries(['SELECT 1'])
    expect(action.resolvedQueries[0]).toBe("SET @@reservation='projects/test/locations/US/reservations/prod';")
  })

  test('should intercept sqlxAction', () => {
    const sqlxActionMock = jest.fn(() => {
      global.dataform.actions.push({
        type: 'table',
        target: { database: 'test-project', schema: 'test-schema', name: 'target_action' },
        preOps: []
      })
    })
    global.dataform.sqlxAction = sqlxActionMock

    autoAssignActions(config)

    global.dataform.sqlxAction()

    const action = global.dataform.actions[0]
    expect(action.preOps).toContain("SET @@reservation='projects/test/locations/US/reservations/prod';")
  })
})
