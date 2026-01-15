const fs = require('fs')
const path = require('path')

const COMPILED_JSON_PATH = path.join(__dirname, '../test-project/compiled.json')
const EXPECTED_RESERVATION = 'SET @@reservation=\'projects/my-test-project/locations/US/reservations/automated\';'

function verify() {
  if (!fs.existsSync(COMPILED_JSON_PATH)) {
    console.error('Error: compiled.json not found. Run compilation first.')
    process.exit(1)
  }

  const compiled = JSON.parse(fs.readFileSync(COMPILED_JSON_PATH, 'utf8'))
  let errors = []

  const checkTable = (name, expectedPreOps) => {
    const table = compiled.tables.find(t => t.target.name === name)
    if (!table) {
      errors.push(`Table ${name} not found`)
      return
    }

    // Check first preOp
    if (!table.preOps || table.preOps[0] !== EXPECTED_RESERVATION) {
      errors.push(`Table ${name} missing reservation preOp. Found: ${table.preOps ? table.preOps[0] : 'none'}`)
    }

    // Check second preOp if provided
    if (expectedPreOps && table.preOps[1] !== expectedPreOps) {
      errors.push(`Table ${name} missing original preOp. Found: ${table.preOps[1]}`)
    }
  }

  const checkOperation = (name, expectedQuery) => {
    const op = compiled.operations.find(o => o.target.name === name)
    if (!op) {
      errors.push(`Operation ${name} not found`)
      return
    }

    if (!op.queries || op.queries[0] !== EXPECTED_RESERVATION) {
      errors.push(`Operation ${name} missing reservation query. Found: ${op.queries ? op.queries[0] : 'none'}`)
    }

    if (expectedQuery && !op.queries.some(q => q.includes(expectedQuery))) {
      errors.push(`Operation ${name} missing original query: ${expectedQuery}`)
    }
  }

  const checkAssertion = (name) => {
    const assertion = compiled.assertions.find(a => a.target.name === name)
    if (!assertion) {
      errors.push(`Assertion ${name} not found`)
      return
    }

    if (assertion.query.includes('SET @@reservation')) {
      errors.push(`Assertion ${name} should NOT have reservation set, but it does.`)
    }
  }

  console.log('--- Verifying Dataform Package Integration ---')

  // Verify automated tests
  checkTable('test_table')
  checkTable('test_view')
  checkTable('test_incremental', 'DECLARE test_var INT64 DEFAULT 1;')
  checkOperation('test_operation', 'CREATE OR REPLACE TEMP TABLE temp_val AS SELECT 1 as val;')
  checkOperation('test_single_op', 'SELECT 1 as single_val')
  checkAssertion('test_assertion_skipped')

  if (errors.length > 0) {
    console.error('FAIL: Verification errors found:')
    errors.forEach(err => console.error(` - ${err}`))
    process.exit(1)
  } else {
    console.log('SUCCESS: All integration tests passed!')
  }
}

verify()
