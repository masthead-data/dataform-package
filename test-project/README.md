# Test Dataform Project

This is a test project to demonstrate and verify the `@masthead-data/dataform-package` locally.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Dataform CLI (if not already installed):
```bash
npm install -g @dataform/cli
```

## Usage

### Compile the project

To compile and see the generated SQL with reservation settings:

```bash
dataform compile
```

### Run the project (requires BigQuery credentials)

To execute against BigQuery (requires proper credentials):

```bash
dataform run
```

### View compiled output

You can examine the compiled SQL to verify that reservation SET statements are being added correctly to the pre_operations of each table.

## Project Structure

- `dataform.json` - Dataform project configuration
- `includes/config.js` - Reservation configuration and setup
- `definitions/` - SQL and JS table/view definitions
  - `critical_dashboard.sqlx` - Uses production reservation
  - `realtime_metrics.sqlx` - Uses production reservation (incremental)
  - `experimental_table.sqlx` - Uses on-demand pricing (development)
  - `large_data_processing.js` - Uses batch reservation (JavaScript API)
  - `monthly_aggregation.js` - Uses batch reservation (JavaScript API)
  - `no_reservation_table.sqlx` - No specific reservation

## Testing

Each definition demonstrates a different use case:

1. **Production critical tables** - Assigned to production reservation
2. **Development tables** - Set to use on-demand pricing ('none')
3. **Batch processing** - Uses dedicated batch reservation
4. **Default behavior** - Tables without specific reservation assignment

Run `dataform compile` to verify the package is working correctly.
