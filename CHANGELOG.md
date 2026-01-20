# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [0.2.0] - 2026-01-20

### Added

- **`autoAssignActions()` method** - Primary integration approach that automatically assigns actions to reservations to all Dataform actions globally without requiring manual code in each action file
- **Matrix testing infrastructure** - Automated testing across multiple Dataform versions (currently - v2.4.2 and v3.0.43)
- **API Reference section** in README with comprehensive documentation of all exported methods

## [0.1.0] - 2025-10-27

### Changed

- **Breaking Change**: Updated `getActionName` to use `database.schema.name` format for operation actions. Action names in your reservation configuration must now include the schema. For example, change `'my-project.my_table'` to `'my-project.my_schema.my_table'` to match Dataform's actual behavior.

## [0.0.1] - 2025-10-06

### Added

- Initial release of the Dataform Package
- Automatic BigQuery reservation assignment based on action names
- Support for high-priority, low-priority, and on-demand reservations
- Comprehensive test suite with Jest
- ESLint configuration for code quality
- Complete documentation and usage examples

### Features

- `reservation_setter()` function for automatic reservation assignment
- Configuration-based action categorization
- Robust error handling and fallback mechanisms
- Support for both `ctx.self()` and `ctx.operation.proto.target` methods
- Performance-optimized with Set-based lookup

### Documentation

- Complete README with usage examples
- API documentation
- Best practices guide
- Troubleshooting section

[Unreleased]: https://github.com/masthead-data/dataform-package/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/masthead-data/dataform-package/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/masthead-data/dataform-package/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/masthead-data/dataform-package/tree/v0.0.1
