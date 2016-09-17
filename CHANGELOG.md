# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## 2.1.2, 2.1.3, 2.1.4 - 2016-09-17
### Changed
- Updated any references to docs to the [rill website](https://rill.site).
- Move some npm scripts to makefile.
- Remove duplicate info in docs.
- Remove some unneeded files when installing with bower.
### Added
- Added docs back to package.json files for use on the docs website.

## 2.1.1 - 2016-09-14
### Changed
- Added node_modules caching to travis.
- Added make file (replaces gulp).
- Added sourcemap to dist.

### Removed
- gulpfile.js (replaced by makefile).

## 2.1.0 - 2016-09-14
### Changed
- Added "files" field to package json and now only "src" files are uploaded to npm.

## 2.0.1 - 2016-09-13
### Changed
- Added new [article](https://medium.com/@iamjohnhenry/browsers-servers-and-apis-2f7b10523f39) to readme.

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
