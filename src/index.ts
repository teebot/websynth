import './commonImports';
import { Observable } from 'rxjs/Observable';
import { makeOscillator } from './osciallator.factory';
import { KEYBOARD_MAPPING, PIANO_MAPPING } from './constants';

const audioCtx = new AudioContext();

// create Oscillator/Gain nodes
const oscillator1 = makeOscillator(audioCtx, 0, 'sawtooth');
oscillator1.gainNode.connect(audioCtx.destination);

const oscillator2 = makeOscillator(audioCtx,0, 'square');
oscillator2.gainNode.connect(audioCtx.destination);

// Create an observable of numbers emitted from a DOM range input
const observeRange = (selector, initialValue = 0): Observable<number> =>
    Observable.fromEvent(document.querySelector(selector), 'input')
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

// Create an observable of waveform from DOM radio buttons
const observeWaveForm = (inputName) => Observable.fromEvent(document.querySelectorAll(`input[name="${inputName}"]`), 'change')
    .map((radioEvent:Event) => (<HTMLInputElement>radioEvent.target).value)
    .startWith('sawtooth');

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
    .distinctUntilChanged()
    .map((keys:Array<string>) => keys.map(k => KEYBOARD_MAPPING[k]))
    .share();

const monoNotePlayed$ = keyboardNotes$.map(notes => notes[0] || 0);
const notesPlayed$ = Observable.merge(pianoKeys$, monoNotePlayed$);

// Observe changes from DOM inputs
const osc1oct$ = observeRange('#octave1');
const osc2oct$ = observeRange('#octave2');

const osc1coarse$ = observeRange('#coarse1');
const osc2coarse$ = observeRange('#coarse2');

const osc1Freq$ = observeFrequency(notesPlayed$, osc1oct$, osc1coarse$);
const osc2Freq$ = observeFrequency(notesPlayed$, osc2oct$, osc2coarse$);

// Main subscribes combining observables and setting the corresponding parameters

observeRange('#gain1', 10).map(i => i/10).subscribe(gain => oscillator1.gainNode.gain.value = gain);
observeRange('#gain2', 10).map(i => i/10).subscribe(gain => oscillator2.gainNode.gain.value = gain);

observeWaveForm('wave1').subscribe(waveForm => oscillator1.oscillatorNode.type = waveForm as OscillatorType);
observeWaveForm('wave2').subscribe(waveForm => oscillator2.oscillatorNode.type = waveForm as OscillatorType);

Observable.combineLatest(osc1Freq$, osc2Freq$)
    .subscribe(([osc1Freq, osc2Freq]) => {
        oscillator1.oscillatorNode.frequency.setValueAtTime(osc1Freq, audioCtx.currentTime);
        oscillator2.oscillatorNode.frequency.setValueAtTime(osc2Freq, audioCtx.currentTime);
});
