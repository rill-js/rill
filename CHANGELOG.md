# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## 2.0.0 - 2016-09-9
### Changed
- Upgraded @rill/http@2.0.0 this has two (potentially breaking) fixes.
  - `req.headers.referrer` will now be a full `href` instead of a `pathname`.
  - Smooth scroll (with hash targets) will now only run when navigating from a page with the same `path`.

## 1.1.2 - 2016-09-2
### Added
- Much more tests (100% coverage!)
- Travis CI
- Coverage and build badges.

### Changed
- Updated dependencies.
- Added code coverage and testing utilities.
- Cleaned up code while testing.

## 1.0.0 - 2016-09-2
### Added
- CHANGELOG.md

### Changed
- Updated dependencies.
- Marked as version 1.0.0 (STABLE).
