import './commonImports';
import { Observable } from 'rxjs/Observable';
import { makeOscillator } from './osciallator.factory';
import { KEYBOARD_MAPPING, PIANO_MAPPING } from './constants';

const audioCtx = new AudioContext();

// create Oscillator/Gain nodes
const oscillator1 = makeOscillator(audioCtx, 0, 'sawtooth');
oscillator1.oscillatorNode.start();

const oscillator2 = makeOscillator(audioCtx,0, 'square');
oscillator2.oscillatorNode.start();

// Create an observable of numbers emitted from a DOM range input
const observeRange = (selector, initialValue = 0): Observable<number> =>
    Observable.fromEvent(document.querySelector(selector), 'change')
        .map((e: Event) => parseInt((<HTMLInputElement>e.target).value))
        .startWith(initialValue);

// Create an observable from different source observables to emit a calculated frequency to play
const observeFrequency = (initialFreq$, oct$, coarse$): Observable<number> => initialFreq$
    .combineLatest(oct$, coarse$)
    .map(([initialFreq, octave, coarse]) => {
        if (initialFreq === 0)
            return 0;
        if (octave === 0)
            return initialFreq + coarse;
        if (octave < 0)
            return (initialFreq / Math.abs(octave - 1)) + coarse;

        return (initialFreq * (octave + 1)) + coarse;
    });

// Observe notes played on the virtual piano and computer keyboard
const pianoKeysReleased$ = Observable.fromEvent(document.querySelectorAll('ul.keys li'), 'mouseup').mapTo(0);
const pianoKeysTouched$ = Observable.fromEvent(document.querySelectorAll('ul.keys li'), 'mousedown')
    .map((e: any) => PIANO_MAPPING[e.target.dataset.note]);
const pianoKeys$ = Observable.merge(pianoKeysTouched$, pianoKeysReleased$);

const keyboardNotes$ = Observable.fromEvent(document, 'keydown').merge(Observable.fromEvent(document, 'keyup'))
    .scan((acc: Array<string>, curr: KeyboardEvent) => {
        if (curr.type === 'keyup') {
            return acc.filter(k => k !== curr.code)
        }
        if (curr.type === 'keydown' && acc.indexOf(curr.code) === -1) {
            return [...acc, curr.code];
        }
        return acc;
    }, [])
    .map((keys:Array<string>) => keys.map(k => KEYBOARD_MAPPING[k]))
    .distinctUntilChanged();

const monoNotePlayed$ = keyboardNotes$.map(notes => notes[0] || 0);
const notesPlayed$ = Observable.merge(pianoKeys$, monoNotePlayed$);

// Observe changes from DOM inputs
const osc1oct$ = observeRange('#octave1');
const osc2oct$ = observeRange('#octave2');

const osc1coarse$ = observeRange('#coarse1');
const osc2coarse$ = observeRange('#coarse2');

const osc1gain$ = observeRange('#gain1', 10).map(i => i/10);
const osc2gain$ = observeRange('#gain2', 10).map(i => i/10);

const osc1Freq$ = observeFrequency(notesPlayed$, osc1oct$, osc1coarse$);
const osc2Freq$ = observeFrequency(notesPlayed$, osc2oct$, osc2coarse$);

const osc1waveForm$ = Observable.fromEvent(document.querySelectorAll('input[name="wave1"]'), 'change')
    .map((radioEvent:Event) => (<HTMLInputElement>radioEvent.target).value)
    .startWith('sawtooth');

const osc2waveForm$ = Observable.fromEvent(document.querySelectorAll('input[name="wave2"]'), 'change')
    .map((radioEvent:Event) => (<HTMLInputElement>radioEvent.target).value)
    .startWith('sawtooth');

// Main subscribe combining all observables and setting the corresponding parameters
Observable.combineLatest(osc1Freq$, osc2Freq$, osc1gain$, osc2gain$, osc1waveForm$, osc2waveForm$)
    .subscribe(([osc1Freq, osc2Freq, osc1gain, osc2gain, osc1waveForm, osc2waveForm]) => {
        oscillator1.oscillatorNode.frequency.value = osc1Freq;
        oscillator1.oscillatorNode.type = osc1waveForm as OscillatorType;
        oscillator1.gainNode.gain.value = osc1gain;

        oscillator2.oscillatorNode.frequency.value = osc2Freq;
        oscillator2.oscillatorNode.type = osc2waveForm as OscillatorType;
        oscillator2.gainNode.gain.value = osc2gain;
});
