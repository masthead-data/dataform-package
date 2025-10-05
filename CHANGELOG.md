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
