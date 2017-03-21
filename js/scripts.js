
var database = firebase.database();

var $tapper = $('#melody-panel');
var $beater = $('#beat-panel');
var $fullPanel = $('#tap-panel');

var $saveButton = $('#save-button');
var $clearButton = $('#clear-button');

var touches = [];
var recordedTouches = [];
var previousBeat = genBeat();

var synchronized = true;
var synchronizeTouches = [];
var beatDuration = 1000;
var beatsPerMeasure = 4;
var logBuffer = [];

function init() {
  previousBeat = genBeat();
  touches = [];
  recordedTouches = [];
  logBuffer = [];

  synchronized = true;
  synchronizeTouches = [];
  beatDuration = 1000;
  beatsPerMeasure = 4;
}
$beater.bind('touchstart', function(e) {
  var beat = genBeat();
  // chop up notes that hasn't ended yet
  var beatDuration = beat.start - previousBeat.start;
  touches.forEach(function(touch) {
    var leftChop = clone(touch);
    var sharedKey = time();
    leftChop.rightSharedKey = sharedKey;
    leftChop.duration = beat.start - touch.start;
    record(recordedTouches, leftChop, beatDuration);
    touch.leftSharedKey = sharedKey;
    touch.start = beat.start;
  });

  // normalize notes that starts after previous beat and
  // ends before this beat
  var endToExtend = beat.start;
  for (var i = recordedTouches.length - 1; i >= 0; i--) {
    var recordedTouch = recordedTouches[i];
    if (recordedTouch.start >= previousBeat.start) {
      if (recordedTouch.type != 'beat') {
        recordedTouch.duration = endToExtend - recordedTouch.start;
        endToExtend = recordedTouch.start;
        var beats = normalize(recordedTouch.duration, beatDuration);
        if (beats.whole == 0 && beats.numer == 0) {
          var removedTouch = recordedTouches.splice(i, 1)[0];
          removedTouch.message = 'removed touch';
          logBuffer.push(removedTouch);
        } else {
          recordedTouch.beats = beats;
        }
      }
    } else {
      if (endToExtend > previousBeat.start) {
        if (recordedTouch.type != 'beat') {
          var sharedKey = time();
          recordedTouch.rightSharedKey = sharedKey;
          var newNote = {
            start: previousBeat.start,
            duration: endToExtend - previousBeat.start,
            leftSharedKey: sharedKey,
          }
          var beats = normalize(newNote.duration, beatDuration);
          if (beats.whole > 0 || beats.numer > 0) {
            newNote.beats = beats;
            // 2 because of the touch of type beat
            // TODO think of a better design to avoid this.
            recordedTouches.splice(i + 2 ,0, newNote);
          }
        }
      }
      break;
    }
  }
  recordedTouches.push(beat);
  previousBeat = beat;
  display(recordedTouches, $beater);
});

$tapper.bind('touchstart', function(e){
  onTouchStart(e, touches);
});

$tapper.bind('touchend', function(e){
    onTouchEnd(e, touches, recordedTouches, false);
});

$clearButton.click(function(){
  init();
  display(recordedTouches, $beater);
});

$saveButton.click(function() {
  var shouldSave = confirm('Should I save it?');
  if (shouldSave) {
    var currTime = time();
    database.ref('testTouches/' + currTime).set({
      name: (new Date).toLocaleString(),
      touches: recordedTouches,
    });
    database.ref('logs/' + currTime).set({
      name: (new Date).toLocaleString(),
      log: logBuffer,
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
        return {whole: 0, numer: 0, denom: maxMult, actual: beats};
      }
      return {whole: whole, numer: numer, denom: mult, actual: beats};
    }
  }
}


function onTouchStart(e, touches){
  e.preventDefault();
  var currTime = time();

  // Clear touches
  // TODO allow multiple notes to roughly start together
  // Currently, only notes that start together exactly works
  for (var i = touches.length - 1; i >= 0; i--) {
    var previousTouch = touches.splice(i, 1)[0];
    previousTouch.duration = currTime - previousTouch.start;
    recordedTouch.push(previousTouch);
  }

  var touchList = e.changedTouches;
  var touch;
  for(var i = 0; i < touchList.length; i++){
    touch = {start: currTime, id: touchList[i].identifier};
    touches.push(touch);
  }
}

function onTouchEnd(e, touches, recordedTouches){
  var currTime = time();  
  var touchList = e.changedTouches;
  for(var i = 0; i < touchList.length; i++){
    touchId = touchList[i].identifier;
    for (var j = touches.length - 1; j >= 0 ; j--){
      if (touches[j].id == touchId){
        var touch = touches.splice(j, 1)[0];
        touch.duration = currTime - touch.start;
        recordedTouches.push(touch);
      }
    }
  }
}

function record(touches, touch, beatDuration) {
  touch.beats = normalize(touch.duration, beatDuration);
  touches.push(touch);
}
function display(touches, $display) {
  var buffer = [];
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    if (touch.type == 'beat') {
      buffer.push(' |');
    } else {
      var beats = touch.beats;
      var sharedKey = touch.leftSharedKey
      
      var tied = false;
      for (var k = i + 1; k < touches.length; k++) {
        var nextTouch = touches[k];
        if (nextTouch.type != 'beat' && touch.rightSharedKey) {
          tied = touch.rightSharedKey == nextTouch.leftSharedKey;
          break;
        }
      }
      var string = '';
      if (beats.whole > 0) {
        string += beats.whole;
        if (beats.numer > 0) {
          string += '-';
        }
      }
      if (beats.numer > 0) {
        string += beats.numer + '/' + beats.denom;
      }
      var numSpaces = (beats.whole + 5) - string.length;
      buffer.push(string);
      for (var j = 0; j < numSpaces; j++) {
        if (j == numSpaces - 1) {
          buffer.push(' ');
        } else {
          if (tied) {
            buffer.push('t');
          } else {
            buffer.push('_');
          }
        }
      }
    }
  }
  $display.text(buffer.join(''));
}

//// Helpers
function time() {
  return (new Date).getTime();
}
function end(touch) {
  return touch.start + touch.duration;
}

function genBeat() {
  return {type: 'beat', start: time()};
}

/// Logic for synchronizing
function computeSynchronizeStat() {
  var numTouches = synchronizeTouches.length;
  if (numTouches > 1) {
    var touch = synchronizeTouches[numTouches - 1];
    var lastTouch = synchronizeTouches[numTouches - 2];
    var averageBeatDuration = touch.start - lastTouch.start;
    return {duration: averageBeatDuration, numBeats: numTouches};
  }
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
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

///// Desktop testing
var $testMelody = $('#test-melody-panel');
$testMelody.bind('mousedown', function(e){
  $tapper.trigger($.Event( "touchstart", {changedTouches:[{identifier: -1}]} ));
});
$testMelody.bind('mouseup', function(e){
  $tapper.trigger($.Event( "touchend", {changedTouches:[{identifier: -1}]}));
});

var $testBeat = $('#test-beat-panel');
$testBeat.bind('mousedown', function(e){
  $beater.trigger($.Event( "touchstart", {changedTouches:[{identifier: -1}]} ));
});
$testBeat.bind('mouseup', function(e){
  $beater.trigger($.Event( "touchend", {changedTouches:[{identifier: -1}]}));
});
