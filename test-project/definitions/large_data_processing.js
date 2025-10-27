publish('large_data_processing', {
  type: 'table',
  schema: 'test',
  description: 'Large batch processing job using batch reservation',
  tags: ['batch_processing']
}).preOps(ctx => `
  ${constant.setReservation(ctx)}
`).query(`
  SELECT
    DATE(ts) as processing_date,
    COUNT(*) as record_count,
    SUM(value) as total_value
  FROM (
    SELECT
      TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL ROW_NUMBER() OVER() HOUR) as ts,
      CAST(RAND() * 1000 AS INT64) as value
    FROM
      UNNEST(GENERATE_ARRAY(1, 10000)) as numbers
  )
  GROUP BY 1
`)
