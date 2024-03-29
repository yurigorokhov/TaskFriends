var fs = require('fs');
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
var size = require('gulp-size');
var minifyCSS = require('gulp-minify-css');
var ngmin = require('gulp-ngmin');
var gulpif = require('gulp-if');
var replace = require('gulp-replace');
var server = lr();

var config = { production: true };
try {
  config = eval('(' + fs.readFileSync('gulp.config', 'utf8') + ')');
} catch (e) {}
var keys = config.production ? {
  APPID: 'TnKwlgf74fHAhpmQKtOLR0OS0exGelFKLC3u88nU',
  CLIENTKEY: 'nWdvt7vCsQxcgflTwtIX9S6bprHWDbdpJqFmFZAo'
} : {
  APPID: 'JwOZKxsRmma9DGgWBl10YVRJdz2W5bjR5SiiJWlK',
  CLIENTKEY: 'a6ZCtotBmVCWeYHdJdgHu9oS5Mx76TATOJZofA4G'
};


var buildDir = './build/';

jsFiles = _([
    'jquery/dist/jquery.js',
    'bootstrap/dist/js/bootstrap.js',
    'underscore/underscore.js',
    'spinjs/spin.js',
    'angular/angular.js',
    'angular-route/angular-route.js',
    'angular-ui/build/angular-ui.js',
    'angular-spinner/angular-spinner.js',
    'angular-block-ui/angular-block-ui.js',
    'angular-animate/angular-animate.js',
    'AngularJS-Toaster/toaster.js',
    'ui-bootstrap/dist/ui-bootstrap-custom-0.10.0.js',
    'iou.js'
  ]).map(function(p) { return buildDir + p; });

//--- Bower ---
gulp.task('bower-build', ['bower'], function() {
  return gulpBowerFiles()
    .pipe(gulp.dest('./build/'));
});

gulp.task('bower', function() {
  return bower()
    .pipe(gulp.dest('bower_redist/'));
});

//--- CSS ---
gulp.task('styles',['bower-build'], function () {
  return gulp.src(['./build/**/*.css', './css/**/*.css'])
    .pipe(concat('iou.min.css'))
    .pipe(minifyCSS(opts))
    .pipe(size())
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

//TODO(yurig): we need to turn mangling on for a smaller js footprint
gulp.task('build-scripts', ['scripts'], function () {
  return gulp.src(jsFiles)
    .pipe(concat('iou.min.js'))
    .pipe(replace(/TASKFRIENDS_APPID/g, keys.APPID))
    .pipe(replace(/TASKFRIENDS_CLIENTKEY/g, keys.CLIENTKEY))
    .pipe(gulpif(config.production, ngmin()))
    .pipe(gulpif(config.production, uglify({ outSourceMap: true, mangle: false })))
    .pipe(size())
    .pipe(gulp.dest('./public/js/'));
});

//--- All ---
gulp.task('build-all', ['build-scripts', 'templates', 'styles'], function () {
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
  }).listen(8080);

  // Listen on port 8000
  server.listen(8001, function (err) {
    if (err) {
      return console.log(err)
    };

    // Watch .js files
    gulp.watch('src/**/*.js', ['build-scripts']);
    gulp.watch('css/**/*.css', ['styles']);
  });
});