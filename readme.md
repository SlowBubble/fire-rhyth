
## Design
* Most of the processing is done at the start of a beat
* Need to introduce another class to distinguish what's immutable (such as 2 beats ago)

## TODO

### 1
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
* add metronome