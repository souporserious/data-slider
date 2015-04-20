// TODO:
//  Add keyboard controls
//  add alias option to be able to control another slider (mainly for thumbnail paging)
//  appendArrowsTo - define where arrows get appended to
//  appendControlsTo - same as above but with controls
//  paging template -> pager: 'nav', page: 'a'
//  look into lazy loading
//  change class names
//  change slides selector
//  yes/no controls
//  yes/no pager
//  prev/next texts
//  yes/no contain controls
//  change pager HTML, allow/default to number
//  create or don't create on instantiation
//  change global options / per slider options
//  have updateOptions method that handles things like normalizing options
//  
//  major inspiration and thank you to this codepen: http://codepen.io/levito/pen/Alcuq/
(function (factory) {
    if(typeof define === 'function' && define.amd) {
        define(['module'], factory);
    }
    else if(typeof exports !== 'undefined') {
        factory(module);
    }
})(function (module) {

    class Slider {

        constructor(slider) {

            this.options = {
                speed: 350,
                delay: 1000,
                autoPlay: false,
                centerMode: false, // if true, slidesToShow needs to be an even number
                centerPadding: '10%',
                pauseOnHover: true,
                easing: 'cubic-bezier(0, .85, .50, 1)',
                slidesToShow: 1,
                slidesToMove: 1,
                defaultSlide: 0,
                controls: true,
                pagination: true,
                infinite: true,
                draggable: true,
                flickTimeout: 400,
                swipeThreshold: 10,
                createOnLoad: true // initialize sliders manually, useful for something that needs to be created/destroyed (modals)
            };

            this.slider = slider;
            this.slides = slider.querySelectorAll('li');
            this.wrapper = document.createElement('div');
            this.controls = document.createElement('nav');
            this.prevControl = document.createElement('a');
            this.nextControl = document.createElement('a');
            
            this.slideCount = this.slides.length;
            this.sliderWidth = this.slideCount * 100;
            this.slideIndex =
            this.lastSlideIndex = 0;
            this.pager =
            this.pages =
            this.autoPlayID =
            this.unbindEvents = null;
            this.isSliding =
            this.isPaused = false;

            // [slider, controls, pager, etc] then can loop through and remove all at once
            this.sliderEvents = [];
            
            // cross-browser props
            this.canWillChange = supports('will-change');
            this.canTransform3d = supports('perspective');
            this.canTransition = supports('transition');
            this.transform = getPropPrefix('transform');
            this.transitionDuration = getPropPrefix('transition-duration');
            this.transitionEasing = getPropPrefix('transition-timing-function');
            this.transitionend = getTransEnd();
            this.supportsTouch = 'ontouchstart' in window || navigator.msMaxTouchPoints;

            // swipe props
            this.deltaX =
            this.deltaY =
            this.startX =
            this.startY =
            this.dragStartEvent =
            this.dragMoveHandler =
            this.dragEndHandler = null;
            this.isDragging =
            this.isSwiping =
            this.isFlick = false;

            // determine drag event type
            if(this.supportsTouch) {
                this.dragStartEventType = 'touchstart';
                this.dragMoveEvent = 'touchmove';
                this.dragEndEvent = 'touchend';
            }
            else {
                this.dragStartEventType = 'mousedown';
                this.dragMoveEvent = 'mousemove';
                this.dragEndEvent = 'mouseup';
            }

            // normalize default slide
            if(this.options.defaultSlide < 0) {
                this.options.defaultSlide = 0;
            }
            else if(this.options.defaultSlide > this.slideCount-1) {
                this.options.defaultSlide = this.slideCount-1;
            }

            // create slider on instantiation
            if(this.options.createOnLoad) {
                this.create();
            }
        }


        /**
         * Create Slider
         */
        create() {

            // add styling classes
            this.wrapper.classList.add('slider-wrapper');

            // wrap slider in wrapper
            this.wrapper.wrap(this.slider);
            
            // add padding to wrapper for centering effect
            // if enabled and slidesToShow is an odd number
            if(this.options.centerMode && (this.options.slidesToShow % 2) === 1) {
                this.wrapper.style.paddingLeft = this.options.centerPadding;
                this.wrapper.style.paddingRight = this.options.centerPadding;
            }

            // add controls
            if(this.options.controls) {
                this.controls.classList.add('controls');
                this.prevControl.classList.add('slide-prev');
                this.nextControl.classList.add('slide-next');

                // add text to controls
                this.prevControl.innerHTML = '<i class="icon icon-arrow-left"></i>';
                this.nextControl.innerHTML = '<i class="icon icon-arrow-right"></i>';

                // append controls to wrapper
                this.wrapper.appendChild(this.prevControl);
                this.wrapper.appendChild(this.nextControl);
            }

            // create pages
            if(this.options.pagination) {
                this.buildPager();
            }

            // add styling classes to slider
            this.slider.classList.add('slider');
            
            // calc slider width
            this.slider.style.width = this.sliderWidth + '%';
            
            // calc slide widths
            for(let i = this.slideCount; i--;) {
                this.slides[i].style.width = ((100/this.options.slidesToShow) / this.slideCount).toFixed(2) + '%';
            }

            // add option based styling classes
            if(this.options.draggable) {
                this.slider.classList.add('draggable');
            }

            // bind all event handlers
            this.bindEvents();

            // arrange slides to add proper classes
            this.arrangeSlides(0);

            // update navigation before capturing first move
            this.updateNavigations(0);

            // position slider to correct index instantly
            this.captureMove(this.options.defaultSlide, false, true);

            // start autoplay
            if(this.options.autoPlay) {
                this.autoPlay();
            }
        }


        /**
         * Update Navigation Classes
         */
        updateNavigations(index) {

            // handle disabled states if not infinite
            if(!this.options.infinite) {
                // if no previous slide, add disabled state to control
                if(this.slideIndex <= 0) {
                    this.prevControl.classList.add('disabled');
                }
                else {
                    this.prevControl.classList.remove('disabled');
                }

                // if no next slide, add disabled state to control
                if(this.slideIndex >= this.slideCount - 1) {
                    this.nextControl.classList.add('disabled');
                }
                else {
                    this.nextControl.classList.remove('disabled');
                }
            }

            // remove active class from old pager
            for(var i = this.pages.length; i--;) {
                this.pages[i].classList.remove('active');
            }

            // add active class to new pager
            this.pages[index].classList.add('active');
        }


        /**
         * Build Slider Pagination
         */
        buildPager() {

            var pageClickHandler = (index, e) => {
                    e.preventDefault();
                    this.captureMove(index);
                },
                pageCount = (this.slideCount / this.slidesToShow);

            // create pager wrapper and set up pages
            this.pager = document.createElement('nav');
            this.pages = [];

            // add styling class to pager
            this.pager.classList.add('slider-pager');

            // loop through slide amount and create pages
            for(let i = 0; i < this.slideCount; i++) {

                var page = document.createElement('a');

                // add click event to page
                page.addEventListener('click', pageClickHandler.bind(this, i), false);

                // add styling class to page
                page.classList.add('slide-page');

                // append page to pager
                this.pager.appendChild(page);

                // push page to pages array
                this.pages.push(page);
            }

            // add pager to slider wrapper
            this.wrapper.appendChild(this.pager);
        }
        

        /**
         * Bind Events
         */
        bindEvents() {

            var willChangeHint = () => {
                    this.willChangeHandler();
                },
                prevControlClickHandler = () => {
                    this.prev();
                },
                nextControlClickHandler = () => {
                    this.next();
                },
                sliderTransEndHandler = () => {

                    // finished sliding
                    this.isSliding = false;

                    // remove will change
                    if(this.canWillChange) {
                        this.willChangeHandler(true);
                    }
                },
                autoPlayEnter = () => {
                    clearTimeout(this.autoPlayID);
                    this.isPaused = true;
                },
                autoPlayLeave = () => {
                    this.isPaused = false;
                    this.autoPlay();
                };

            // Add will-change before click to next slide for better performance
            if(this.canWillChange) {
                this.prevControl.addEventListener('mouseenter', willChangeHint, false);
                this.nextControl.addEventListener('mouseenter', willChangeHint, false);
            }
            
            // Add click handlers
            this.prevControl.addEventListener('click', prevControlClickHandler, false);
            this.nextControl.addEventListener('click', nextControlClickHandler, false);
            
            // Add transitionend listener
            this.slider.addEventListener(this.transitionend, sliderTransEndHandler, false);

            // listen for drag
            if(this.options.draggable) {
                this.dragStartEvent = e => this.dragStart(e);
                this.slider.addEventListener(this.dragStartEventType, this.dragStartEvent, false);
            }

            // listen for pause
            if(this.options.autoPlay && this.options.pauseOnHover) {
                this.slider.addEventListener('mouseenter', e => autoPlayEnter(e), false);
                this.slider.addEventListener('mouseleave', e => autoPlayLeave(e), false);
            }

            // Remove all event listeners (used in destroy method)
            this.unbindEvents = function () {
                this.prevControl.removeEventListener('mouseenter', willChangeHint, false);
                this.nextControl.removeEventListener('mouseenter', willChangeHint, false);
                this.prevControl.removeEventListener('click', prevControlClickHandler, false);
                this.nextControl.removeEventListener('click', nextControlClickHandler, false);
                this.slider.removeEventListener(this.transitionend, sliderTransEndHandler, false);

                // unbind drag start event
                if(this.options.draggable) {
                    this.slider.removeEventListener(this.dragStartEventType, this.dragStartEvent, false);
                }

                // unbind autoplay events
                if(this.options.autoPlay && this.options.pauseOnHover) {
                    this.slider.removeEventListener('mouseenter', autoPlayEnter, false);
                    this.slider.removeEventListener('mouseleave', autoPlayLeave, false);
                }
            };
        }


        /**
         * Destroy Slider
         */
        destroy() {

            // remove controls
            if(this.options.controls) {
                this.wrapper.removeChild(this.prevControl);
                this.wrapper.removeChild(this.nextControl);
            }

            // remove pager
            if(this.options.pagination) {
                this.wrapper.removeChild(this.pager);
            }
            
            // remove wrapper
            this.wrapper.unwrap();

            // remove styling class from slider
            this.slider.classList.remove('slider');

            // remove draggable styling class
            if(this.options.draggable) {
                this.slider.classList.remove('draggable');
            }
            
            // reset slider styles
            this.slider.style.width = '';
            this.slider.style.willChange = '';
            this.slider.style[this.transform] = '';
            this.slider.style[this.transitionDuration] = '';
            
            // reset slide widths and classes
            for(let i = this.slideCount; i--;) {
                
                var slide = this.slides[i];

                slide.style.width = '';
                slide.className = '';
            }

            // unbind all event handlers
            this.unbindEvents();
        }
        

        /**
         * Move To Previous Slide
         */
        prev() {

            // if not endless, bail if on/before first slide or sliding
            if(!this.options.infinite && this.slideIndex <= 0 || this.isSliding) return;

            // get prev slide
            var slide = this.getNearbySlides(this.slideIndex);

            // go to previous slide
            this.captureMove(slide.prev.index(), -1);
        }
        

        /**
         * Move To Next Slide
         */
        next() {

            // if not endless, bail if on/after last slide or sliding
            if(!this.options.infinite && this.slideIndex >= this.slideCount-1 || this.isSliding) return;

            // get next slide
            var slide = this.getNearbySlides(this.slideIndex);

            // go to next slide
            this.captureMove(slide.next.index(), 1);
        }
        

        /**
         * Capture Direction
         */
        captureMove(index, direction, instant = false) {

            var reInitSlides = () => {

                // arrange slides
                this.arrangeSlides(newIndex);

                // stopped sliding
                this.isSliding = false;

                // check if we are moving to next or previous slide and mimic endless slide
                if((direction === 1 && newIndex === 0) || (direction === -1 && newIndex === this.slideCount - 1)) {
                    this.slide(0, true);
                }

                // remove event after completion
                this.slider.removeEventListener(this.transitionend, reInitSlides, false);
            };

            // if not a number, on the same index, or sliding, bail
            if(typeof index !== 'number' || index === this.slideIndex || this.isSliding) return;

            // we are now sliding
            this.isSliding = true;

            // get new index
            var newIndex = index % this.slideCount,
                currSlide = this.slider.querySelector('.current');

            // set current slide index
            this.slideIndex = currSlide.index();

            // if no direction provided, set the target slide
            if(!direction) {
                this.slides[newIndex].classList.add('target');
            }
            direction = direction || newIndex - this.slideIndex;

            // move to the desired slide
            this.slide(direction, instant);

            // if we're moving instantly we still need to reinitialize slides
            if(instant) {
                reInitSlides();
            }
            // otherwise reinitialize slides after transitioning
            else {
                this.slider.addEventListener(this.transitionend, reInitSlides, false);
            }

            // update control states
            if(this.options.pagination) {
                this.updateNavigations(newIndex);
            }

            this.lastSlideIndex = this.slideIndex;
        }


        /**
         * Perform The Slide
         */
        slide(direction, instant) {

            // get sliding values
            //var x = -(direction + this.slideIndex) * (this.options.slidesToMove * (100/this.options.slidesToShow)),
            var x = -(direction + this.slideIndex) * (this.options.slidesToMove * (100/this.options.slidesToShow)),
                s = instant ? 0 : this.options.speed;
            
            // use transitons and transforms if supported
            if(this.canTransition) {

                var translate;

                // if we can't use will change and support 3D transforms, hack acceleration
                if(!this.canWillChange && this.canTransform3d) {
                    translate = 'translate3d('+ x / this.slideCount +'%, 0, 0)';
                }
                else {
                    translate = 'translateX('+ x / this.slideCount +'%)';
                }
                this.slider.style[this.transform] = translate;
                this.slider.style[this.transitionDuration] = s + 'ms';
                this.slider.style[this.transitionEasing] = this.options.easing;
            }
            // won't transition, but at least it still works
            else {
                this.slider.style.left = x + '%';
            }
        }


        /**
         * Arrange Slides
         */
        arrangeSlides(index) {
            
            var slide = this.getNearbySlides(index);

            // set new index
            this.slideIndex = index;

            // remove all classes from slides
            // TODO: figure out how to not reset all classes and just remove what we need to
            //var classes = ['prev', 'current', 'next', 'target', 'last-child'];
            for(var i = this.slides.length; i--;) {
                this.slides[i].className = '';
            }

            // add "prev" class to previous slide
            slide.prev.classList.add('prev');

            // if we are on the first slide, add a "last-child" class to the
            // last slide to allow instant movement
            if(this.options.infinite && slide.curr.previousElementSibling === null) {
                slide.prev.classList.add('last-child');
            }

            // add "current" class to current slide
            slide.curr.classList.add('current');

            // add "next" class to next slide
            slide.next.classList.add('next');
        }


        /**
         * Dragability
         */
        isSwipe(threshold) {
            return Math.abs(this.deltaX) > Math.max(threshold, Math.abs(this.deltaY));
        }

        dragStart(e) {

            // prevent grabbing any children
            e.preventDefault();

            // bail if in the middle of a slide
            if(this.isSliding) return;

            // get proper event
            var touch = this.supportsTouch ? e.touches[0] : e;

            // we're now dragging
            this.isDragging = true;

            // add styling class
            this.slider.classList.add('dragging');

            // reset deltas
            this.deltaX = this.deltaY = 0;

            // store the initial starting coordinates
            this.startX = touch.pageX;
            this.startY = touch.pageY;

            // attach events
            this.dragMoveHandler = this.dragMove.bind(this);
            this.dragEndHandler = this.dragEnd.bind(this);

            window.addEventListener(this.dragMoveEvent, this.dragMoveHandler, false);
            window.addEventListener(this.dragEndEvent, this.dragEndHandler, false);

            // determine if a flick or not
            this.isFlick = true;

            window.setTimeout(() => {
                this.isFlick = false;
            }, this.options.flickTimeout);
        }

        dragMove(e) {

            // get proper event
            var touch = this.supportsTouch ? e.touches[0] : e;

            // prevent grabbing any children
            e.preventDefault();
            
            // determine how much we have moved
            this.deltaX = this.startX - touch.pageX;
            this.deltaY = this.startY - touch.pageY;

            if(this.isSwipe(this.options.swipeThreshold)) {
                e.preventDefault();
                e.stopPropagation();
                this.isSwiping = true;
            }
            if(this.isSwiping) {
                this.slide(this.deltaX / this.sliderWidth, true);
            }
        }

        dragEnd(e) {

            var threshold = this.isFlick ? this.options.swipeThreshold : this.sliderWidth / 2,
                transEnd = () => {

                    this.slide(0, true);
                    this.isDragging = false;

                    // remove event after completion
                    this.slider.removeEventListener(this.transitionend, transEnd, false);
                };

            // prevent grabbing any children
            e.preventDefault();

            // remove styling class
            this.slider.classList.remove('dragging');

            // handle swipe
            if(this.isSwipe(threshold)) {
                (this.deltaX < 0) ? this.prev() : this.next();
            }
            else {
                this.slide(0, !this.deltaX);
            }

            // we are no longer swiping
            this.isSwiping = false;

            // remove dragging events after completion
            window.removeEventListener(this.dragMoveEvent, this.dragMoveHandler, false);
            window.removeEventListener(this.dragEndEvent, this.dragEndHandler, false);
            
            // listen for end of drag
            this.slider.addEventListener(this.transitionend, transEnd, false);

            // prevent error from touch events
            return true;
        }


        /**
         * Autoplay
         */
         autoPlay() {
            this.autoPlayID = setTimeout(() => {
                this.next();

                if(!this.isPaused) {
                    this.autoPlay();
                }
            }, this.options.delay);
         }


        /**
         * Helpers
         */
        getNearbySlides(index) {

            var currSlide = this.slides[index],
                prevSlide = currSlide.previousElementSibling ? currSlide.previousElementSibling : this.slides[this.slideCount-1],
                nextSlide = currSlide.nextElementSibling ? currSlide.nextElementSibling : this.slides[0];

            return {
                curr: currSlide,
                prev: prevSlide,
                next: nextSlide
            };
        }

        willChangeHandler(unset) {

            unset = unset || false;

            if(!unset) {
                this.slider.style.willChange = 'transform';
            }
            else {
                this.slider.style.willChange = '';
            }
        }
    }

    // Helper Functions

    // Test For CSS3 property support
    var supports = (function() {

        'use strict';

        var div = document.createElement('d'),
            vendors = 'Khtml ms O Moz Webkit'.split(' '),
            len = vendors.length;

        return function(prop) {

            if(prop in div.style) return true;

            prop = prop.replace(/^[a-z]/, function(val) {
                return val.toUpperCase();
            });

            while(len--) {
                if(vendors[len] + prop in div.style) {
                    return true;
                }
                if(len < 0) {
                    return false;
                }
            }
        };
    })();

    // Get property prefix
    var getPropPrefix = function (prop) {

        var styles = document.createElement('p').style,
            vendors = ['ms', 'O', 'Moz', 'Webkit'], i;

        if(styles[prop] === '') return prop;

        prop = prop.charAt(0).toUpperCase() + prop.slice(1);

        for(i = vendors.length; i--;) {
            if(styles[vendors[i] + prop] === '') {
                return (vendors[i] + prop);
            }
        }
    };

    // Get proper transition end
    var getTransEnd = function () {

        var div = document.createElement('div'),
            t, transition, transitions = {
                'WebkitTransition': 'webkitTransitionEnd',
                'MozTransition': 'transitionend',
                'OTransition': 'oTransitionEnd otransitionend',
                'msTransition': 'MSTransitionEnd',
                'transition': 'transitionend'
            };

        for(t in transitions) {
            if(div.style[t] !== undefined) {
                 transition = transitions[t];
            }
        }

        return transition === undefined ? 'transitionend' : transition;
    };

    // Wrap an HTMLElement around each element in an HTMLElement array.
    // http://stackoverflow.com/questions/3337587/wrapping-a-set-of-dom-elements-using-javascript/13169465#13169465
    HTMLElement.prototype.wrap = function(elms) {
        
        if(!elms.length) elms = [elms];
        
        for(var i = elms.length - 1; i >= 0; i--) {
            
            var child = (i > 0) ? this.cloneNode(true) : this,
                el = elms[i],
                parent  = el.parentNode,
                sibling = el.nextSibling;
            
            child.appendChild(el);

            if(sibling) {
                parent.insertBefore(child, sibling);
            } else {
                parent.appendChild(child);
            }
        }
    };

    // http://stackoverflow.com/a/176404/1461204
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/createDocumentFragment
    HTMLElement.prototype.unwrap = function() {

        var fragment = document.createDocumentFragment();

        while(this.firstChild) {
            fragment.appendChild(this.firstChild);
        }
        this.parentNode.replaceChild(fragment, this);
    };

    // http://stackoverflow.com/a/18191104/1461204
    HTMLElement.prototype.index = function () {

        var self = this,
            parent = self.parentNode,
            i = 0;

        while(self.previousElementSibling){
            i++;
            self = self.previousElementSibling;
        }
        return this === parent.children[i] ? i : -1;
    };

    // export class
    module.exports = Slider;
});