// This file runs AFTER reservations.js alphabetically (starts with 'z')
// It tests the monkeypatching logic (intercepting new actions)

// 1. Standard Table (Monkeypatch)
publish('test_table_post', {
    type: 'table',
    description: 'Table created after initialization'
}).query('SELECT 2 as val')

// 2. Operation (Monkeypatch)
operate('test_operation_post')
    .queries('SELECT 2 as op_val')

// 3. Assertion (Monkeypatch - should still be skipped)
assert('test_assertion_post_skipped')
    .query('SELECT 2 as val WHERE false')
