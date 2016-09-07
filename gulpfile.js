var gulp = require('gulp')
var mocha = require('gulp-mocha')
var istanbul = require('gulp-istanbul')
var uglify = require('gulp-uglify')
var buffer = require('vinyl-buffer')
var source = require('vinyl-source-stream')
var browserify = require('browserify')
var tests = './test'
var dist = './dist'
var src = './src'

/*
 * Setup istanbul instrumented files.
 */
gulp.task('instrument', function () {
  return gulp.src(src + '/*.js')
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
})

/*
 * Run tests.
 */
gulp.task('test', ['instrument'], function () {
  return gulp.src(tests + '/*.test.js', { read: false })
    .pipe(mocha())
    .pipe(istanbul.writeReports())
    .pipe(istanbul.enforceThresholds({ thresholds: { global: 100 } }))
    .once('end', process.exit)
})

/**
 * Build standalone browser version.
 */

gulp.task('build', function () {
  return browserify({
    entries: src + '/index.js',
    extensions: ['.js'],
    standalone: 'rill'
  })
    .plugin('bundle-collapser/plugin')
    .bundle()
    .pipe(source('rill.js'))
    .pipe(buffer())
    .pipe(uglify({
      mangle: true,
      compress: {
        unused: true,
        sequences: true,
        properties: true,
        dead_code: true,
        conditionals: true,
        comparisons: true,
        evaluate: true,
        booleans: true,
        loops: true,
        if_return: true,
        join_vars: true,
        cascade: true,
        drop_console: true,
        screw_ie8: true
      }
    }))
    .pipe(gulp.dest(dist))
})
