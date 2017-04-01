
## Design
* Most of the processing is done at the start of a beat
* Need to introduce another class to distinguish what's immutable (such as 2 beats ago)
* beat detection
  - compute the shortest distance for a 1/16 grid vs a 1/12 grid if there are at least 2 events snapping to nonzero values.
  - may need to deal with other tuples in the future with an option
* how to fix mistake: add a snapping mode in the future
* how to allow for 1/6 and 1/32 note: require zooming out and in (add zooming in the future)
* have a forward arrow for the beat button that is available to advance in beat
  - for chord pitch mode, the button should recognize that the notes before the beat is a chord and merge them and of course translate it into a chord symbol.
  - for melody pitch mode, the button should not merge the pitches and just use 1/16 notes!
* Also, autodetect chord using the strong beats.
* If the pitch has been inserted before the beat cursor is hit, then when the beater is hit, the cursor should go to the next beat after the notes (after merging).

## TODO

### 1
* add keyboard support
* display notes prettily
* don't allow notes to overlap unless they start and end together
  - deal with orphaned touches that are already moved to recordedTouches
* add rest in the beginning
* empty measure bug???

### 2
* change touches to events
  - add types like note, strong-beat
* think of how to adjust the noise level after metronome is introduced
  - should it be customizable with a sensible default?
* think of change while preserving existing structure with lyrics
  - the model I like is copy-pasting snippets onto one snippet

### 3
* add cursor to move back and overwrite (allow touch to navigate back)
* allow backspace by beat
* think of how overwrite works
* think of how chord works; should we use info from melody? how to progress?
* add metronome

