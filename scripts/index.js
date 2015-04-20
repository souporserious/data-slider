var Slider = require('./slider.js');

var dataSlider = document.querySelector('[data-slider]');

var slider = new Slider(dataSlider);

// INSPO
// http://titon.io/en/toolkit/2.1.1/components/carousel
// http://kenwheeler.github.io/slick/
// http://owlgraphic.com/owlcarousel/

// Data-Carousel / Data-Slider
// 
// usage:
// 
// HTML:
// <ul data-slider="images">
//  <li></li>
//  ...
// </ul>
// 
// JS:
// var Slider = require('./slider.js');
// 
// slider initialized on data attribute
// pass custom options by doing this:
// 
// var imageSlider = Slider.getSlider('images');
// 
// OR
// 
// var imageSlider = new Slider('images', {options});
// 
// imageSlider({
//  navText: ['prev', 'next'] // use false for no text
//  pager: true,
//  pagerNumbers: true, // show respective number inside page
// });
// 
// allow global styles, similar to how GSAP does theirs
// this method would extend the default options, similar to initializing a plugin
// 
// Slider.options({
//  speed: 3000,
//  easing: linear,
//  initOnLoad: false // initialize sliders manually, useful for something that needs to be created/destroyed (modals)
// }); 
// 
// OR
// 
// Slider.defaults({options});
// 
// Class Names / SASS vars
// slider
// slides / slider-track
// slide
// 
// slide-prev
// slide-next
// 
// slider-pager
// slider-page
// 
// After completed, create a custom build tool to provide custom defaults for variable
// names as well as options
// 
// Public Methods
// calculate
// slide
// prev
// next
// start
// stop
// reset
// create
// destroy
// 
// 
// cool features
// media queries // would support IE10+ but could use matchmedia polyfill, if no media query provided no need to require
// 
// Slider({
//  mediaQueries: {
//      small: '(max-width: 480px)',
//      medium: ['(min-width: 481px)', '(max-width: 768px)'],
//      large: '(min-width: 768px)'
//  }
// });
// 
// Custom Options for specific break points, either per slider or for all sliders
// Slider.atBreakpoint('small', {
//  options....
// });