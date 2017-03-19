
var database = firebase.database();

var $tapper = $('#tapping-panel');
var $tester = $('#test-panel');
var $saveButton = $('#save-button');

var touches = [];
var recordedTouches = [];
var synchronized = false;
var synchronizeTouches = [];
var beatDuration = 1000;
var beatsPerMeasure = 4;
function init() {
  touches = [];
  recordedTouches = [];
  synchronized = false;
  synchronizeTouches = [];
  beatDuration = 1000;
  beatsPerMeasure = 4;
}

$tester.bind('mousedown', function(e){
  $tapper.trigger($.Event( "touchstart", {changedTouches:[{identifier: -1}]} ));
});

$tester.bind('mouseup', function(e){
  $tapper.trigger($.Event( "touchend", {changedTouches:[{identifier: -1}]}));
});

function computeSynchronizeStat() {
  var numTouches = synchronizeTouches.length;
  if (numTouches > 1) {
    var touch = synchronizeTouches[numTouches - 1];
    var lastTouch = synchronizeTouches[numTouches - 2];
    var averageBeatDuration = touch.start - lastTouch.start;
    return {duration: averageBeatDuration, numBeats: numTouches};
  }
}

function checkAndUpdateSynchronized(currTime) {
  var numTouches = synchronizeTouches.length;
  if (numTouches > 1) {
    var lastTouch = synchronizeTouches[numTouches - 1];
    var secondLastTouch = synchronizeTouches[numTouches - 2];
    averageBeatDuration =  lastTouch.start - secondLastTouch.start;
    if (averageBeatDuration * 1.5 < currTime - lastTouch.start) {
      synchronized = true;
      beatDuration = averageBeatDuration;
      beatsPerMeasure = numTouches;
    }
  }
}
$tapper.bind('touchstart', function(e){
  if (!synchronized) {
    checkAndUpdateSynchronized((new Date).getTime());
  }
  onTouchStart(e, touches);
});

$tapper.bind('touchend', function(e){
  if (synchronized) {
    onTouchEnd(e, touches, recordedTouches, false);
    display(recordedTouches, $tapper);
  } else {
    onTouchEnd(e, touches, synchronizeTouches, true);
    var stat = computeSynchronizeStat();
    if (stat){
      $tapper.text('Num beats: ' + stat.numBeats + '\nBeat duration in ms: ' + stat.duration);
    }
  }
});

$saveButton.click(function() {
  var shouldSave = confirm('Cleared. Should I save it?');
  if (shouldSave) {
    var currTime = (new Date).getTime();
    database.ref('testTouches/' + currTime).set({
      name: (new Date).toLocaleString(),
      touches: recordedTouches,
    });
  }
  init();
});

function normalize(duration, beat) {
  var noise = 1 / 4;
  var maxMult = 2;
  var beats = duration / beat;
  for (var mult = 1; mult <= maxMult; mult++) {
    var multBeats = mult * beats;
    var multGuess = Math.round(mult * beats);
    if (Math.abs(multBeats - multGuess) < mult * noise || mult == 4) {
      var whole = Math.floor(multGuess / mult)
      var numer = multGuess - whole * mult;
      if (numer == 0 && whole == 0) {
        return {whole: 0, numer: 1, denom: maxMult, actual: beats};
      }
      return {whole: whole, numer: numer, denom: mult, actual: beats};
    }
  }
}


function onTouchStart(e, touches){
  e.preventDefault();
  var currTime = (new Date).getTime();
  var touchList = e.changedTouches;
  var touch;
  for(var i = 0; i < touchList.length; i++){
    touch = {start: currTime, id: touchList[i].identifier};
    touches.push(touch);
  }
}

function onTouchEnd(e, touches, recordedTouches, synchronizing){
  var currTime = (new Date).getTime();  
  var touchList = e.changedTouches;
  for(var i = 0; i < touchList.length; i++){
    touchId = touchList[i].identifier;
    for (var j = touches.length - 1; j >= 0 ; j--){
      if (touches[j].id == touchId){
        var touch = touches.splice(j, 1)[0];
        touch.duration = currTime - touch.start;
        var previousTouchEndTime = null;
        if (recordedTouches.length > 0) {
          var previousTouch = recordedTouches.splice(recordedTouches.length - 1, 1)[0];
          previousTouch.duration = currTime - previousTouch.start;
          record(recordedTouches, previousTouch);          
          // var previousTouch = recordedTouches[recordedTouches.length - 1];
          // previousTouchEndTime = previousTouch.start + previousTouch.duration;
          // var restDuration = currTime - previousTouchEndTime;
          // if (!synchronizing && restDuration > 0) {
          //   record(recordedTouches, {
          //     start: previousTouchEndTime, duration: restDuration, meta: 'rest'
          //   });
          // }
        }
        record(recordedTouches, touch);
      }
    }
  }
}

function record(touches, touch) {
  touch.beats = normalize(touch.duration, beatDuration);
  touches.push(touch);
}
function display(touches, $display) {
  var buffer = [];
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    var beats = touch.beats;
    var string = '';
    if (touch.meta == 'rest') {
      string += 'r';
    }
    if (beats.whole > 0) {
      string += beats.whole;
      if (beats.numer > 0) {
        string += '-';
      }
    }
    if (beats.numer > 0) {
      string += beats.numer + '/' + beats.denom;
    }
    var numSpaces = (beats.whole + 1) * 4 - string.length;
    buffer.push(string);
    for (var j = 0; j < numSpaces; j++) {
      if (j == numSpaces - 1) {
        buffer.push(' ');
      } else {
        buffer.push('_');
      }
    }
  }
  $display.text(buffer.join(''));
}