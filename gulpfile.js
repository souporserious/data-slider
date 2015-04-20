var gulp = require('gulp'),
    sass = require('gulp-sass'),
    postcss = require('gulp-postcss'),
    webpack = require('gulp-webpack'),
    browserSync = require('browser-sync'),
    reload = browserSync.reload;

// Polyfill for postcss
require('es6-promise').polyfill();

// Compile SASS
gulp.task('styles', function () {
    
    var autoprefixer = require('autoprefixer-core')({
        browsers: ['last 2 versions', 'ie >= 9']
    });

    gulp.src('styles/**/*.scss')
        .pipe(sass({
            errLogToConsole: true,
            precision: 2
        }))
        .pipe(postcss([
            autoprefixer.postcss
        ]))
        .pipe(gulp.dest('./'))
        .pipe(reload({stream: true}));
});

// Compile ES6 scripts
gulp.task('scripts', function () {
    return gulp.src('scripts/**/*.js')
        .pipe(webpack({
            entry: {
                index: './scripts/index.js',
            },
            output: {
                filename: '[name].js',
                chunkFilename: '[id].js'
            },
            module: {
                loaders: [
                    { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'}
                ]
            }
        }))
        .pipe(gulp.dest('./'));
});

// Make sure scripts are compiled before reloading
gulp.task('scripts-compiled', ['scripts'], reload);

// Start server & watch files
gulp.task('serve', ['styles', 'scripts'], function() {

    browserSync({
        server: './',
        port: 8000,
        open: false
    });

    gulp.watch('styles/**/*.scss', ['styles']);
    gulp.watch('scripts/**/*.js', ['scripts-compiled']);
    gulp.watch('*.html').on('change', reload);
});

gulp.task('default', ['serve']);