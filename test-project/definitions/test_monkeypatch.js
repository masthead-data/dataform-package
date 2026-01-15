/* 
DEBUG SNIPPET: Run this in your Cloud Console 
Then check the "Compiled SQL" of 'monkeypatch_debug_results' 
*/

const testTableName = 'monkeypatch_test_result'
let log = []

// 1. Check if global methods are even there
log.push(`publish_type: ${typeof global.publish}`)

// 2. Check if the property is configurable (can be overwritten)
const desc = Object.getOwnPropertyDescriptor(global, 'publish')
log.push(`publish_configurable: ${desc ? desc.configurable : 'N/A'}`)
log.push(`publish_writable: ${desc ? desc.writable : 'N/A'}`)

// 3. Attempt a simple local monkeypatch
if (typeof global.publish === 'function') {
  const originalPublish = global.publish
  try {
    global.publish = function(name, ...args) {

      const builder = originalPublish.apply(this, [name, ...args])
      // If monkeypatching works, this table will have a pre-op
      if (name === testTableName) {
        builder.preOps('SELECT \'MONKEY_WAS_HERE\' as check')
      }
      return builder
    }
    log.push('monkeypatch_attempt: success_set')
  } catch (e) {
    log.push(`monkeypatch_attempt: failed_to_set (${e.message})`)
  }
}

// 4. Trigger the test
publish(testTableName, { type: 'table' }).query('SELECT 1 as val')

// 5. Output results to a table so you can read them in the UI
publish('monkeypatch_debug_results', { type: 'table' }).query(`
  SELECT 
    '${log.join(' | ')}' as environment_report,
    '${typeof dataform !== 'undefined'}' as has_dataform_global
`)