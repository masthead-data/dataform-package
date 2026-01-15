/**
 * Extracts action name from Dataform context object
 * @param {Object} ctx - Dataform context object
 * @returns {string|null} The extracted action name or null if not found
 */
function getActionName(ctx) {
  if (!ctx) return null

  // Primary method: ctx.self()
  if (typeof ctx.self === 'function' && !ctx?.operation) {
    const selfName = ctx.self()
    if (selfName) return selfName.replace(/`/g, '').trim()
  }

  // Fallback: construct from proto target
  if (ctx?.operation?.proto?.target) {
    const target = ctx.operation.proto.target
    return target ? `${target.database}.${target.schema}.${target.name}` : null
  }

  return null
}

/**
 * Finds the matching reservation for an action name
 * @param {string} actionName - The action name to look up
 * @param {Array} configSets - Preprocessed configuration with Sets
 * @returns {string|null} The reservation identifier or null
 */
function findReservation(actionName, configSets) {
  if (!actionName || typeof actionName !== 'string') {
    return null
  }

  for (const config of configSets) {
    if (config.actionSet.has(actionName)) {
      return config.reservation
    }
  }

  return null
}

/**
 * Validates and preprocesses the configuration array
 * @param {Array} config - Raw configuration array
 * @returns {Array} Preprocessed configuration with Sets
 */
function preprocessConfig(config) {
  if (!config || !Array.isArray(config)) {
    throw new Error('Configuration must be a non-empty array')
  }

  if (config.length === 0) {
    throw new Error('Configuration array cannot be empty')
  }

  return config.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Configuration item at index ${index} must be an object`)
    }

    if (!('reservation' in item)) {
      throw new Error(`Configuration item at index ${index} is missing 'reservation' property`)
    }

    if (!Array.isArray(item.actions)) {
      throw new Error(`Configuration item at index ${index} must have 'actions' as an array`)
    }

    return {
      tag: item.tag,
      reservation: item.reservation,
      actions: item.actions,
      actionSet: new Set(item.actions)
    }
  })
}

/**
 * Creates a reservation setter function with the provided configuration
 * @param {Array} config - Array of reservation configuration objects
 * @returns {Function} A reservation setter function that takes a Dataform context
 * @example
 * const { createReservationSetter } = require('@masthead-data/dataform-package')
 *
 * const config = [
 *   {
 *     tag: 'production',
 *     reservation: 'projects/my-project/locations/US/reservations/prod',
 *     actions: ['my_dataset.important_table']
 *   }
 * ]
 *
 * const reservationSetter = createReservationSetter(config)
 *
 * // Use in Dataform:
 * // ${reservationSetter(ctx)}
 */
function createReservationSetter(config) {
  const preprocessedConfig = preprocessConfig(config)

  return function reservationSetter(ctx) {
    const actionName = getActionName(ctx)
    const reservation = findReservation(actionName, preprocessedConfig)
    return reservation ? `SET @@reservation='${reservation}';` : ''
  }
}

/**
 * Helper to apply reservation to a single action
 * @param {Object} action - Dataform action object
 * @param {Array} configSets - Preprocessed configuration
 */
function applyReservationToAction(action, configSets) {
  // 1. Identify where the data lives
  // If no .proto, assume action itself is the data container (compiled object)
  const proto = action.proto || action

  // Check if it's a valid object to modify
  const hasPreOpsFn = typeof action.preOps === 'function'
  const allowedTypes = ['table', 'view', 'incremental', 'materialized_view']
  const hasType = proto.type && allowedTypes.includes(proto.type)
  const isOperation = !!proto.queries || !!action.contextableQueries
  const isAssertion = proto.type === 'assertion' || (action.constructor && action.constructor.name === 'Assertion')

  if (isAssertion || (!hasPreOpsFn && !hasType && !isOperation)) {
    return
  }

  // 2. Extract Action Name
  let actionName = null
  if (proto.target) {
    const database = proto.target.database || (global.dataform && global.dataform.projectConfig && global.dataform.projectConfig.defaultDatabase)
    const schema = proto.target.schema || (global.dataform && global.dataform.projectConfig && global.dataform.projectConfig.defaultSchema)
    const name = proto.target.name
    actionName = database && schema ? `${database}.${schema}.${name}` : name
  }

  // 3. Apply Reservation
  const reservation = findReservation(actionName, configSets)
  if (reservation) {
    const statement = reservation === 'none'
      ? 'SET @@reservation=\'none\';'
      : `SET @@reservation='${reservation}';`

    // For operation builders, the queries are often set AFTER the builder is created via .queries()
    // We monkeypatch the .queries() method to ensure our statement is always prepended.
    if (isOperation && typeof action.queries === 'function' && !action._queriesPatched) {
      const originalQueriesFn = action.queries
      action.queries = function (queries) {
        let queriesArray = queries
        if (typeof queries === 'function') {
          queriesArray = (ctx) => {
            const result = queries(ctx)
            if (typeof result === 'string') {
              return [statement, result]
            } else if (Array.isArray(result)) {
              return [statement, ...result]
            }
            return result
          }
        } else if (typeof queries === 'string') {
          queriesArray = [statement, queries]
        } else if (Array.isArray(queries)) {
          // Check if already prepended to avoid duplicates
          if (!queries.includes(statement)) {
            queriesArray = [statement, ...queries]
          }
        }
        return originalQueriesFn.apply(this, [queriesArray])
      }
      action._queriesPatched = true
    }

    // Prefer modifying data structure directly if we know it's a safe type
    // This handles both Builders (via .proto) and Compiled Objects (direct)

    // 1. Try contextablePreOps (Tables/Views Builders before resolution)
    if (Array.isArray(action.contextablePreOps)) {
      if (!action.contextablePreOps.includes(statement)) {
        action.contextablePreOps.unshift(statement)
      }
    }
    // 2. Try contextableQueries (Operations Builders before resolution)
    else if (Array.isArray(action.contextableQueries)) {
      if (!action.contextableQueries.includes(statement)) {
        action.contextableQueries.unshift(statement)
      }
    }
    // 3. Try proto.preOps (Compiled Tables/Views or Resolved Builders)
    else if (hasType) {
      if (!proto.preOps) {
        proto.preOps = []
      }
      if (Array.isArray(proto.preOps)) {
        if (!proto.preOps.includes(statement)) {
          proto.preOps.unshift(statement)
        }
      } else if (hasPreOpsFn) {
        action.preOps(statement)
      }
    }
    // 4. Try proto.queries (Compiled Operations or Resolved Builders)
    else if (Array.isArray(proto.queries)) {
      if (!proto.queries.includes(statement)) {
        proto.queries.unshift(statement)
      }
    }
    // 5. Fallback to function API (likely Tables/Views)
    else if (hasPreOpsFn) {
      action.preOps(statement)
    }
  }
}

/**
 * Automatically applies reservation configurations to all actions in the project
 * @param {Array} config - Array of reservation configuration objects
 */
function applyAutomaticReservations(config) {
  const preprocessedConfig = preprocessConfig(config)

  // 1. Process existing actions (in case this is called late)
  if (global.dataform && global.dataform.actions) {
    global.dataform.actions.forEach(action => {
      applyReservationToAction(action, preprocessedConfig)
    })
  }

  // 2. Monkeypatch global functions to intercept future actions
  const globalMethods = ['publish', 'operate', 'assert']

  globalMethods.forEach(methodName => {
    if (typeof global[methodName] === 'function') {
      const originalMethod = global[methodName]
      global[methodName] = function (...args) {
        const actionBuilder = originalMethod.apply(this, args)

        // The action should be the last one added to the session
        if (global.dataform && global.dataform.actions && global.dataform.actions.length > 0) {
          const lastAction = global.dataform.actions[global.dataform.actions.length - 1]
          applyReservationToAction(lastAction, preprocessedConfig)
        }

        return actionBuilder
      }
    }
  })

  // 3. Monkeypatch session-level methods for SQLX
  if (global.dataform && typeof global.dataform.sqlxAction === 'function') {
    const originalSqlxAction = global.dataform.sqlxAction
    global.dataform.sqlxAction = function (...args) {
      const result = originalSqlxAction.apply(this, args)

      if (global.dataform && global.dataform.actions && global.dataform.actions.length > 0) {
        const lastAction = global.dataform.actions[global.dataform.actions.length - 1]
        applyReservationToAction(lastAction, preprocessedConfig)
      }
      return result
    }
  }
}

module.exports = {
  createReservationSetter,
  getActionName,
  applyAutomaticReservations
}
