var fs         = require("fs");
var gulp       = require("gulp");
var mocha      = require("gulp-mocha");
var uglify     = require("gulp-uglify");
var buffer     = require("vinyl-buffer");
var source     = require("vinyl-source-stream");
var browserify = require("browserify");
var details    = require("./package.json");
var tests      = "./test";

/*
* Run tests.
*/
gulp.task("test", function () {
	return gulp.src(tests + "/*Test.js", { read: false })
		.pipe(mocha());
});

/**
 * Build standalone browser version.
 */

gulp.task("build", function () {
	return browserify({
		entries: "./src/index.js",
		extensions: [".js"],
		standalone: "rill"
	})
		.plugin("bundle-collapser/plugin")
		.bundle()
		.pipe(source("rill.js"))
		.pipe(buffer())
		.pipe(uglify({
			mangle: true,
			compress: {
				unused:       true,
				sequences:    true,
				properties:   true,
				dead_code:    true,
				conditionals: true,
				comparisons:  true,
				evaluate:     true,
				booleans:     true,
				loops:        true,
				if_return:    true,
				join_vars:    true,
				cascade:      true,
				drop_console: true,
				screw_ie8:    true
			}
		}))
		.pipe(gulp.dest("./bin"))
});