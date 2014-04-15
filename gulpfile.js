var gulp = require('gulp');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var bower = require('gulp-bower');
var clean = require('gulp-clean');
var _ = require('underscore');
var gulpBowerFiles = require('gulp-bower-files');
var lr = require('tiny-lr');
var streamqueue = require('streamqueue');
var staticServer = require('node-static');
var server = lr();

var buildDir = './build/';

jsFiles = _([
    'jquery/dist/jquery.js',
    'underscore/underscore.js',
    'angular/angular.js',
    'angular-route/angular-route.js',
    'angular-ui/build/angular-ui.js',
    'ui-bootstrap/dist/ui-bootstrap-custom-0.10.0.js',
    'parse-js-sdk/lib/parse.js',
    'iou.js'
  ]).map(function(p) { return buildDir + p; });

//--- Bower ---
gulp.task('bower-build', ['bower'], function() {
  return gulpBowerFiles()
    .pipe(gulp.dest('./build/'));
});

gulp.task('bower', function() {
  return bower()
    .pipe(gulp.dest('redist/'));
});

//--- CSS ---
gulp.task('styles',['bower-build'], function () {
  return gulp.src(['./build/**/*.css', './css/**/*.css'])
    .pipe(concat('iou.css'))
    .pipe(gulp.dest('./public/css'));
});

//--- HTML ---
gulp.task('templates', ['bower-build'], function () {
  var base = buildDir + 'ui-bootstrap/';
  return gulp.src(base + 'template/**/*.html', { base: base })
    .pipe(gulp.dest('./public/'));
});

//--- JS ---
gulp.task('scripts', ['bower-build'], function () {
  return gulp.src('./src/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(concat('iou.js'))
  	.pipe(gulp.dest('./build/'));
});

gulp.task('build-scripts', ['scripts'], function () {
  return gulp.src(jsFiles)
    .pipe(concat('iou.js'))
    .pipe(gulp.dest('./public/js/'));
});

//--- All ---
gulp.task('build-all', ['scripts', 'templates', 'styles'], function () {
  return gulp.src(jsFiles)
    .pipe(concat('iou.js'))
    .pipe(gulp.dest('./public/js/'));
});

//--- Clean ---
gulp.task('clean', function() {
  return streamqueue({ objectMode: true },
      gulp.src(['public/js'], {read: false}),
      gulp.src(['public/css'], {read: false}),
      gulp.src(['public/template'], {read: false}),
      gulp.src(['build'], {read: false})
    ).pipe(clean());
});

//--- Default task --- 
gulp.task('default', ['clean'], function() {
    gulp.start('build-all');
});

 
//--- Watch ---
gulp.task('watch', function() {
 
  var file = new staticServer.Server('./public');

  require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        file.serve(request, response);
    }).resume();
  }).listen(8000);

  // Listen on port 8000
  server.listen(8001, function (err) {
    if (err) {
      return console.log(err)
    };

    // Watch .js files
    gulp.watch('src/*.js', ['build-scripts']);
    gulp.watch('css/*.css', ['styles']);
  });
});