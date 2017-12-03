import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/mergeMap';
import MIDIAccess = WebMidi.MIDIAccess;
import MIDIInput = WebMidi.MIDIInput;
import MIDIMessageEvent = WebMidi.MIDIMessageEvent;

const midiAccess$ = Observable.from(navigator.requestMIDIAccess());
enum keyPressed { On, Off }

/**
 * Emits all midi inputs available
 * @type Observable<Array<MIDIInput>>
 */
export const midiInputs$ = midiAccess$.map((midi: MIDIAccess) => {
    return Array.from(midi.inputs).map(([id, input]) => input);
});

export const midiInputTriggers$: Observable<any> = midiInputs$
    .mergeMap(inputs =>
        Observable.create((observer) =>
            inputs.forEach(i =>
                i.onmidimessage = (event) => observer.next(event)
            )
        )
    )
    .map((m: MIDIMessageEvent) => {
        const [origin, key, velocity] = Array.from(m.data);
        const keyP = (origin >= 144 && origin <= 159 && velocity > 0) ? keyPressed.On : keyPressed.Off;
        return { pitch : mtof(key, 440), keyPressed: keyP };
    })
    .scan((notes, note) => {
        if (note.keyPressed === keyPressed.On && notes.indexOf(note) === -1) {
            return [note, ...notes];
        }
        return notes.filter(n => n.pitch !== n.pitch);
    }, [])
    .distinctUntilChanged()
    .startWith([{ pitch: 0, keyPressed: keyPressed.Off }])
    .share();

/**
 * midi note to frequency
 * https://github.com/kedromelon/mtof/blob/master/index.js
 * @param midiNote
 * @param concertPitch
 * @returns {number}
 */
function mtof(midiNote, concertPitch) {
    if (concertPitch === undefined) concertPitch = 440;

    if (typeof midiNote !== 'number') {
        throw new TypeError("'mtof' expects its first argument to be a number.")
    }

    if (typeof concertPitch !== 'number') {
        throw new TypeError("'mtof' expects its second argument to be a number.")
    }

    return Math.pow(2, (midiNote - 69) / 12) * concertPitch;
}