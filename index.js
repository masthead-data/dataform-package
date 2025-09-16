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
    return target ? `${target.database}.${target.name}` : null
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
 * const { createReservationSetter } = require('@masthead-data/dataform-reservation-plugin')
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

module.exports = {
  createReservationSetter,
  getActionName
}
