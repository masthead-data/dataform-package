publish('monthly_aggregation', {
  type: 'table',
  schema: 'test',
  description: 'Monthly aggregation using batch reservation',
  tags: ['batch_processing']
}).query(`
  SELECT
    FORMAT_DATE('%Y-%m', current_date) as month,
    'aggregated_metrics' as metric_category,
    SUM(metric_value) as monthly_total
  FROM (
    SELECT
      CURRENT_DATE() as current_date,
      CAST(RAND() * 100 AS INT64) as metric_value
    FROM
      UNNEST(GENERATE_ARRAY(1, 1000))
  )
  GROUP BY 1, 2
`)
