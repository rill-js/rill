# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## 5.0.1, 5.0.2 - 2017-06-06
### Changed
- Update deps.
- No longer relies on `process.browser`, instead uses browser field to attach to document.

## 5.0.0 - 2017-05-18
### Changed
- Upgraded @rill/http which has a [breaking change](https://github.com/rill-js/http/blob/master/CHANGELOG.md#500-501---2017-05-18). (This change will only be breaking for those who rely on @rill/http directly)

## 4.3.4, 4.3.5 - 2017-04-23
### Changed
- Update dependencies.
- Misc documentation cleanup.

## 4.3.2, 4.3.3 - 2017-03-28
### Changed
- Update dependencies. (Fixes issue in mini-url where baseurl was not optional in some browsers).

## 4.3.1 - 2017-03-23
### Changed
- Fix download link in readme.

## 4.3.0 - 2017-03-23
### Changed
- Ensure all requests in the browser are async.


## 4.2.0, 4.2.1 - 2017-03-23
### Changed
- Update @rill/http which added new options to the browser adapter's 'fetch' method. Also a url string is now allowed as the first argument.

## 4.1.5 - 2017-03-23
### Changed
- Fix regression with parsing querystrings on GET forms.

## 4.1.3, 4.1.4 - 2017-03-21
### Changed
- Update logo link for npmjs.com.
- More JSDoc improvements.

## 4.1.2 - 2017-03-17
### Changed
- Fixed regression where referrer header was no longer the full href.

## 4.1.1 - 2017-03-14
### Changed
- Improve inline JSDoc comments.

## 4.1.0 - 2017-03-11
### Changed
- Removed need for fetch api polyfill. (Promise polyfill still needed for older browsers).
- Optimized Rill's file size in several ways.
  * Switched to [events-light](https://www.npmjs.com/package/events-light) from browserify events shim.
  * Switch to [mini-url](https://www.npmjs.com/package/mini-url) and [mini-querystring](https://www.npmjs.com/package/mini-querystring) from browserify url and querystring shims.
  * Removed unused methods from @rill/http.
  * Removed Buffer dependency in the browser, now uses [Blobs](https://developer.mozilla.org/en/docs/Web/API/Blob).

## 3.0.0 - 2016-11-01
### Changed
- Updated to majorly refactored and fully tested @rill/http.
  * Added Rill#createServer method to get a node server from the rill app.
  * Switch to [https://github.com/jshttp/cookie](cookie) for cookie parsing.
  * Other non breaking changes to [@rill/http changelogs](https://github.com/rill-js/http/blob/master/CHANGELOG.md#user-content-300---2016-10-31).

## 2.5.2 - 2016-11-08
### Changed
- Add node 7.0.0 to travis build.

## 2.5.0, 2.5.1 - 2016-11-08
### Changed
- Fix for breaking change in HttpServer#listen in node 7.0.0.

## 2.4.0 - 2016-10-12
### Changed
- Updated @rill/http. This fixes an issue in safari where named submit buttons were not being parsed on form submissions.
- Updated pathToRegexp. This allows for better hostname matching support (previously some issues existed for splat host names such as 'mysite.:something+.com'), this should now be fixed.

## 2.3.0 - 2016-10-01
### Changed
- Exposes `ctx.req.matchPath` and `ctx.req.matchHost` which allow users to check what the current `path` and `host` being matched are.
- Splat paths (such as `/test/*`) will now properly make trailing slashes optional. In this case `/test` is now treated as valid where before only `/test/` would have been valid.

## 2.1.8 - 2016-09-28
### Changed
- Updated @rill/error which now has two new methods (fail and assert).

## 2.1.7 - 2016-09-24
### Changed
- Added another isomorphic article to README.
- Updated dev dependencies.

## 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6 - 2016-09-17
### Changed
- Link rill logo to [rill website](https://rill.site).
- Changed readme logo to use svg from [rill website](https://rill.site).
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
