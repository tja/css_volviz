// volumetric.js
//
// This code is provided to you pursuant to the terms and conditions set forth in the evaluation license (or
// subsequent license agreement) between your organization and Thomas Jansen.
//
// Author(s): Thomas Jansen (thomas.c.jansen@gmail.com)

//
// Global variables
//
var kSliceCount             = 128;      // the volume is 128 voxels wide in all directions
var kSliceCountFactor       = 1;        // change this to 2 or 4 if it renders too slow

var animationIntervalId_    = null;
var transformationMatrix_   = new WebKitCSSMatrix().scale(2.75, 2.75, 2.75);

var lastAnimationTime_      = 0;
var lastPosition_           = null;

//
// Document loaded
//
$(document).ready(function() {
    // create three orientations for a 128x128x128 volume
    for(var i = 0; i < kSliceCount; i += kSliceCountFactor) {
        var offset = i - (kSliceCount - 1.0) / 2.0;
        $('<div class="slice"></div>').appendTo($('#x')).css('-webkit-transform', 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + (+offset) + ',1)');
        $('<div class="slice"></div>').appendTo($('#y')).css('-webkit-transform', 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + (+offset) + ',1)');
        $('<div class="slice"></div>').appendTo($('#z')).css('-webkit-transform', 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + (-offset) + ',1)');
    }

    // fading in and out of datasets
    $('#datasets a').hover(function() {
        $(this).filter(':not(.active)').animate( { opacity: 1.0 }, { duration: 'fast', queue: false } );
        $(this).next('span')           .animate( { opacity: 1.0 }, { duration: 'fast', queue: false } );
    },
    function() {
        $(this).filter(':not(.active)').animate( { opacity: 0.5 }, { duration: 'fast', queue: false } );
        $(this).next('span')           .animate( { opacity: 0.0 }, { duration: 'fast', queue: false } );
    })

    // load new dataset
    $('#datasets a').click(function(e) {
        e.preventDefault();

        loadVolume($(this).attr('id'));

        $(this).closest('#datasets').find('a').removeClass('active').css('opacity', 0.5);
        $(this).addClass('active').css('opacity', 1.0);
    });

    // mouse / touch control
    $('#mouse_layer')[0].onmousedown   = function(e) { handleStart(e, e.pageX, e.pageY); };
    $('#mouse_layer')[0].onmouseup     = function(e) { handleStop(e); };
    $('#mouse_layer')[0].onmouseleave  = function(e) { handleStop(e); };
    $('#mouse_layer')[0].onmousemove   = function(e) { handleMove(e, e.pageX, e.pageY); };

    $('#mouse_layer')[0].ontouchstart  = function(e) { handleStart(e, e.touches[0].pageX, e.touches[0].pageY); };
    $('#mouse_layer')[0].ontouchend    = function(e) { handleStop(e); };
    $('#mouse_layer')[0].ontouchcancel = function(e) { handleStop(e); };
    $('#mouse_layer')[0].ontouchmove   = function(e) { handleMove(e, e.touches[0].pageX, e.touches[0].pageY); };

    // start with first dataset
    $('#datasets a:first').click();
});

//
// Load volumetric data
//
function loadVolume(name) {
    // clean up UI
    $('#object').hide();
    $('.orientation').removeClass('show');

    $('#loading').show()
    $('#progress_container #progress').css('width', 0);

    animationStop();

    $('.slice').addClass('loading').css('background', '');

    // set up (pre-fetched) images for the three directions
	$([ 'x', 'y', 'z']).each(function(i, dir) {
        var path = 'slices/' + name + '/' + dir + '/';
        $('#' + dir + ' .slice').each(function(index, slice) {
            $('<img/>').attr('src', path + ('000' + index * kSliceCountFactor).substr(-3) + '.png').load(function() {
                // when loaded, set as background image
                $(slice).css('background', "url('" + this.src + "')").removeClass('loading');
                // check if done with loading
                sliceLoaded();
            });
        });
    });
}

//
// Slice Loading Process
//
function sliceLoaded() {
    // set progress bar
    var slicesTotal = 3 * (kSliceCount / kSliceCountFactor);
    var slicesLeft  = $('.slice.loading').length;

    $('#progress_container #progress').css('width', (100.0 - (slicesLeft * 100.0 / slicesTotal)).toFixed() + '%');

    // all sliced loaded
    if(!slicesLeft) {
        $('#loading').fadeOut();
        $('#object').fadeIn();

        animationStart();
    }
}

//
// Transform volume rotation
function transformVolume() {
    // set transformation
    $('#object').css( { '-webkit-transform': transformationMatrix_.toString() } );

    // activate best viewing angle
    var vecX = Math.abs(transformationMatrix_.m13);
    var vecY = Math.abs(transformationMatrix_.m23);
    var vecZ = Math.abs(transformationMatrix_.m33);

    $('#x').toggleClass('show', (vecX >= vecY) && (vecX >= vecZ));
    $('#y').toggleClass('show', (vecY >  vecX) && (vecY >= vecZ));
    $('#z').toggleClass('show', (vecZ >  vecX) && (vecZ >  vecY));
}

//
// Start animation
//
function animationStart() {
    if(animationIntervalId_ === null) {
        lastAnimationTime_    = new Date().getTime();
        animationIntervalId_  = setInterval(animationTick, 20);
    }
}

//
// Stop animation
//
function animationStop() {
    if(animationIntervalId_ !== null) {
        clearInterval(animationIntervalId_);
        animationIntervalId_ = null;
    }
}


//
// Animate by one tick
//
function animationTick() {
  // update transformation matrix
  var newAnimationTime  = new Date().getTime();
  transformationMatrix_ = transformationMatrix_.rotate((newAnimationTime - lastAnimationTime_) * 0.020,
                                                       (newAnimationTime - lastAnimationTime_) * 0.010,
                                                       (newAnimationTime - lastAnimationTime_) * 0.015);
  lastAnimationTime_    = newAnimationTime;

  // transform dataset
  transformVolume();
}

//
// Mouse/Touch control starts
//
function handleStart(e, x, y) {
    e.preventDefault();

    animationStop();
    lastPosition_ = { x: x, y: y };
}

//
// Mouse/Touch control stops
//
function handleStop(e) {
    e.preventDefault();

    animationStart();
    lastPosition_ = null;
}

//
// Mouse/Touch control changes
//
function handleMove(e, x, y) {
    e.preventDefault();

    if(lastPosition_) {
        // update transformation matrix
        transformationMatrix_  = transformationMatrix_.rotateAxisAngle(transformationMatrix_.m12,
                                                                       transformationMatrix_.m22,
                                                                       transformationMatrix_.m32,
                                                                       x - lastPosition_.x)
                                                      .rotateAxisAngle(transformationMatrix_.m11,
                                                                       transformationMatrix_.m21,
                                                                       transformationMatrix_.m31,
                                                                       lastPosition_.y - y);

        lastPosition_ = { x: x, y: y };

        // transform dataset
        transformVolume();
    }
}
