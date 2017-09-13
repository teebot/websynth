import './commonImports';
import { Observable } from 'rxjs/Observable';
import { makeOscillator } from './osciallator.factory';

const audioCtx = new AudioContext();

// create Oscillator nodes
const osc1 = makeOscillator(audioCtx, 0, 'sawtooth');
osc1.start();

const osc2 = makeOscillator(audioCtx, 0, 'square');
osc2.start();

const observeRange = (selector, initialValue): Observable<number> =>
    Observable.fromEvent(document.querySelector(selector), 'change')
        .map((e: Event) => parseInt((<HTMLInputElement>e.target).value))
        .startWith(initialValue);

const note$ = observeRange('#note', 0);
const osc1oct$ = observeRange('#octave1', 1);
const osc2oct$ = observeRange('#octave2', 1);
const osc1coarse$ = observeRange('#coarse1', 0);
const osc2coarse$ = observeRange('#coarse2', 0);

note$.combineLatest(osc1oct$, osc2oct$, osc1coarse$, osc2coarse$)
    .subscribe(([noteFreq, osc1oct, osc2oct, osc1coarse, osc2coarse]) => {
        osc1.frequency.value = (noteFreq * osc1oct) + osc1coarse;
        osc2.frequency.value = (noteFreq * osc2oct) + osc2coarse;
});
