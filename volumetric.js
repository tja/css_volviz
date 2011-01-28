// volumetric.js                                       Copyright (C) 2010-11 Thomas Jansen. All Rights Reserved.
//
// This code is provided to you pursuant to the terms and conditions set forth in  the  evaluation  license  (or
// subsequent license agreement) between your organization and Thomas Jansen.
//
// Author(s): Thomas Jansen (thomas.c.jansen@gmail.com)


// ---[ GLOBAL VARIABLES ]--------------------------------------------------------------------------------------

var kSliceCount             = 128;                            // the volume is 128 voxels wide in all directions
var kSliceCountFactor       = 1;                              //    change this to 2 or 4 if it renders too slow

var animationIntervalId_    = null;
var transformationMatrix_   = new WebKitCSSMatrix().scale(2.75, 2.75, 2.75);

var lastAnimationTime_      = 0;
var lastPosition_           = null;


// ---[ GLOBAL METHODS ]----------------------------------------------------------------------------------------

// is called when the page is loaded...
$(document).ready(function()
{
  // 1: create the three orientations for a 128x128x128 volume...
  for(var i = 0; i < kSliceCount; i += kSliceCountFactor)
  {
    var offset = i - (kSliceCount - 1.0) / 2.0;
    
    // 1.1: x orientation...
    $('<div class="slice"></div>').appendTo($('#x'))
                                  .css('-webkit-transform',
                                       'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + (+offset) + ',1)');

    // 1.2: y orientation...
    $('<div class="slice"></div>').appendTo($('#y'))
                                  .css('-webkit-transform',
                                       'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + (+offset) + ',1)');

    // 1.3: z orientation...
    $('<div class="slice"></div>').appendTo($('#z'))
                                  .css('-webkit-transform',
                                       'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + (-offset) + ',1)');
  }

  // 2: bind some events...

    // 2.1: dataset selection...
    $('#datasets a').hover(function()
                           {
                             // 2.1.1: fade this item and description in...
                             $(this).filter(':not(.active)').animate( { opacity: 1.0 },
                                                                      { duration: 'fast', queue: false } );
                             $(this).next('span')           .animate( { opacity: 1.0 },
                                                                      { duration: 'fast', queue: false } );
                           },
                           function()
                           {
                             // 2.1.2: fade this item and description out...
                             $(this).filter(':not(.active)').animate( { opacity: 0.5 },
                                                                      { duration: 'fast', queue: false } );
                             $(this).next('span')           .animate( { opacity: 0.0 },
                                                                      { duration: 'fast', queue: false } );
                           })
                    .click(function(event)
                           {
                             // 2.1.3: load new dataset...
                             loadVolume($(this).attr('id'));

                             $(this).closest('#datasets').find('a').removeClass('active')
                                                                   .css('opacity', 0.5);

                             $(this).addClass('active')
                                    .css('opacity', 1.0);;

                             event.preventDefault();
                           });

    // 2.2: controlling...
    $('#mouse_layer')[0].onmousedown   = function(e) { handleStart(e, e.pageX, e.pageY); };
    $('#mouse_layer')[0].onmouseup     = function(e) { handleStop(e); };
    $('#mouse_layer')[0].onmouseleave  = function(e) { handleStop(e); };
    $('#mouse_layer')[0].onmousemove   = function(e) { handleMove(e, e.pageX, e.pageY); };

    $('#mouse_layer')[0].ontouchstart  = function(e) { handleStart(e, e.touches[0].pageX, e.touches[0].pageY); };
    $('#mouse_layer')[0].ontouchend    = function(e) { handleStop(e); };
    $('#mouse_layer')[0].ontouchcancel = function(e) { handleStop(e); };
    $('#mouse_layer')[0].ontouchmove   = function(e) { handleMove(e, e.touches[0].pageX, e.touches[0].pageY); };
  
  // 3: select first dataset...
  $('#datasets a:first').click();
});


// ---[ VOLUME METHODS ]--------------------------------------------------------------------------------------

// load a volumetric data set...
function loadVolume(name)
{
  // 1: reset user interface...
  $('#object').hide();
  $('.orientation').removeClass('show');

  $('#loading').show()
  $('#progress_container #progress').css('width', 0);
  
  // 2: stop old animation and discard all data...
  animationStop();

  $('.slice').addClass('loading')
             .css('background', '');

  // 3: set up (pre-fetched) images for the three directions...
  
  var dirs = [ 'x', 'y', 'z' ];
  for(var i in dirs)
  {
    var path = 'slices/' + name + '/' + dirs[i] + '/';

    // 3.1: start background loading for all images...
    $('#' + dirs[i] + ' .slice').each(function(index, slice)
                                      {
                                        $('<img/>').attr('src', path + ('000' + index * kSliceCountFactor).substr(-3) + '.png')
                                                   .load(function()
                                                         {
                                                           // 3.1.1: when loaded, set as BG image...
                                                           $(slice).css('background', "url('" + this.src + "')")
                                                                   .removeClass('loading');
                                  
                                                           // 3.1.2: check if all are loaded...
                                                           sliceLoaded();
                                                         });
                                      });
  }
}


// handle slice loading progress...
function sliceLoaded()
{
  // 1: set progress bar...
  var slicesTotal = 3 * (kSliceCount / kSliceCountFactor);
  var slicesLeft  = $('.slice.loading').length;

  $('#progress_container #progress').css('width', (100.0 - (slicesLeft * 100.0 / slicesTotal)).toFixed() + '%');

  // 2: check if all images loaded?
  if(slicesLeft)
    return;

  // 3: yes, fade out progress bar and start animation...
  $('#loading').fadeOut();
  $('#object').fadeIn();

  animationStart();
}


// transform volume by global matrix...
function transformVolume()
{
  // 1: set it for the object...
  $('#object').css( { '-webkit-transform': transformationMatrix_.toString() } );

  // 2: show the best orientation of the data set...
  var vecX = Math.abs(transformationMatrix_.m13);
  var vecY = Math.abs(transformationMatrix_.m23);
  var vecZ = Math.abs(transformationMatrix_.m33);

  $('#x').toggleClass('show', (vecX >= vecY) && (vecX >= vecZ));
  $('#y').toggleClass('show', (vecY >  vecX) && (vecY >= vecZ));
  $('#z').toggleClass('show', (vecZ >  vecX) && (vecZ >  vecY));
}


// ---[ ANIMATION METHODS ]-------------------------------------------------------------------------------------

// start the automatic movement of the dataset...
function animationStart()
{
  if(animationIntervalId_ !== null)
    return;

  lastAnimationTime_    = new Date().getTime();
  animationIntervalId_  = setInterval(animationTick, 20);
}


// stop the automatic movement of the dataset...
function animationStop()
{
  if(animationIntervalId_ === null)
    return;

  clearInterval(animationIntervalId_);
  animationIntervalId_ = null;
}


// automatically move the dataset by one tick...
function animationTick()
{
  // 1: update the transformation matrix...
  var newAnimationTime  = new Date().getTime();
 
  transformationMatrix_ = transformationMatrix_.rotate((newAnimationTime - lastAnimationTime_) * 0.020,
                                                       (newAnimationTime - lastAnimationTime_) * 0.010,
                                                       (newAnimationTime - lastAnimationTime_) * 0.015);

  lastAnimationTime_    = newAnimationTime;

  // 2: transform the dataset...
  transformVolume();
}


// ---[ MOUSE/TOUCH CONTROL ]-----------------------------------------------------------------------------------

// mouse/touch control starts (e.g. button clicked)...
function handleStart(event, x, y)
{
  event.preventDefault();

  animationStop();
  lastPosition_ = { x: x, y: y };
  
}


// mouse/touch control stops (e.g. button released)...
function handleStop(event)
{
  event.preventDefault();

  animationStart();
  lastPosition_ = null;
}


// mouse/touch control changes (e.g. mouse has been moved)...
function handleMove(event, x, y)
{
  event.preventDefault();

  // 1: skip if control is not active...
  if(!lastPosition_)
    return;

  // 2: update the transformation matrix...
  transformationMatrix_  = transformationMatrix_.rotateAxisAngle(transformationMatrix_.m12,
                                                                 transformationMatrix_.m22,
                                                                 transformationMatrix_.m32,
                                                                 x - lastPosition_.x)
                                                .rotateAxisAngle(transformationMatrix_.m11,
                                                                 transformationMatrix_.m21,
                                                                 transformationMatrix_.m31,
                                                                 lastPosition_.y - y);

  lastPosition_ = { x: x, y: y };

  // 3: transform the dataset...
  transformVolume();
}
