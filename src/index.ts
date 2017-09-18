import './commonImports';
import { Observable } from 'rxjs/Observable';
import { makeOscillator } from './oscillator.factory';
import { KEYBOARD_MAPPING, PIANO_MAPPING } from './constants';
import { observeRadios, observeRange, observeCheckbox } from './dom.util';
import { drawOscilloscope } from './oscilloscope';

const VALID_KEYS = Object.keys(KEYBOARD_MAPPING);
const AudioContext = (<any>window).AudioContext || (<any>window).webkitAudioContext;

const audioCtx = new AudioContext();
const lowpassFilter = audioCtx.createBiquadFilter();
const analyser = audioCtx.createAnalyser();
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.85;

lowpassFilter.type = 'lowpass';

// create Oscillator/Gain nodes
const oscillator1 = makeOscillator(audioCtx, 0, 'sawtooth');
oscillator1.gainNode.connect(lowpassFilter);

const oscillator2 = makeOscillator(audioCtx, 0, 'square');
oscillator2.gainNode.connect(lowpassFilter);

lowpassFilter.connect(analyser);
analyser.connect(audioCtx.destination);

// Create an observable from different source observables to emit a calculated frequency to play
const observeFrequency = (initialFreq$, oct$, coarse$): Observable<number> => initialFreq$
    .combineLatest(oct$, coarse$)
    .map(([initialFreq, octave, coarse]) => {
        if (initialFreq === 0)
            return 0;

        return (initialFreq * Math.pow(2, octave)) + coarse;
    });

// Observe notes played on the virtual piano and computer keyboard
const pianoKeysReleased$ = Observable.fromEvent(document.querySelectorAll('ul.keys li'), 'mouseup').mapTo(0);
const pianoKeysTouched$ = Observable.fromEvent(document.querySelectorAll('ul.keys li'), 'mousedown')
    .map((e: any) => PIANO_MAPPING[e.target.dataset.note]);
const pianoKey$ = Observable.merge(pianoKeysTouched$, pianoKeysReleased$);

const keyboardNotes$ = Observable.fromEvent(document, 'keydown').merge(Observable.fromEvent(document, 'keyup'))
    .scan((acc: Array<string>, curr: KeyboardEvent) => {
        if (curr.type === 'keyup') {
            return acc.filter(k => k !== curr.code)
        }
        if (curr.type === 'keydown' && acc.indexOf(curr.code) === -1 && VALID_KEYS.indexOf(curr.code) !== -1) {
            return [...acc, curr.code];
        }
        return acc;
    }, [])
    .distinctUntilChanged()
    .map((keys: Array<string>) => keys.map(k => KEYBOARD_MAPPING[k]))
    .share();

const monoNotePlayed$ = keyboardNotes$.map(notes => notes[0] || 0);
const notePlayed$ = Observable.merge(pianoKey$, monoNotePlayed$);

// Observe changes from DOM inputs
const osc1oct$ = observeRange('#octave1', -1);
const osc2oct$ = observeRange('#octave2', -1);

const osc1coarse$ = observeRange('#coarse1');
const osc2coarse$ = observeRange('#coarse2');

const osc1Freq$ = observeFrequency(notePlayed$, osc1oct$, osc1coarse$);
const osc2Freq$ = observeFrequency(notePlayed$, osc2oct$, osc2coarse$);

const glideEnabled$ = observeCheckbox('#glideOn', false);
const glide$ = Observable.combineLatest(glideEnabled$, observeRange('#glide', 1).map(i => i / 10))
    .map(([glideEnabled, glide]) => glideEnabled ? glide : 0);

// Main subscribes combining observables and setting the corresponding parameters

const gain1$ = observeRange('#gain1', 10).map(i => i / 10);
const gain2$ = observeRange('#gain2', 10).map(i => i / 10);

const attack$ = observeRange('#attack', 0).map(i => i / 10);
const decay$ = observeRange('#decay', 0).map(i => i / 10);
const sustain$ = observeRange('#sustain', 10).map(i => i / 10);
const release$ = observeRange('#release', 0).map(i => i / 10);

// Apply envelope on oscillators gain
Observable.combineLatest(notePlayed$, gain1$, gain2$, attack$, decay$, sustain$, release$)
    .subscribe(([freq, gain1, gain2, attack, decay, sustain, release]) => {
        // NOTE OFF
        if (freq === 0) {
            envGenOn(oscillator1.gainNode.gain, release);
            envGenOn(oscillator2.gainNode.gain, release);
            // NOTE ON
        } else {
            envGenOff(oscillator1.gainNode.gain, gain1, attack, sustain, decay);
            envGenOff(oscillator2.gainNode.gain, gain2, attack, sustain, decay);
        }
    });

observeRadios('wave1', 'sawtooth').subscribe(waveForm => oscillator1.oscillatorNode.type = waveForm as OscillatorType);
observeRadios('wave2', 'sawtooth').subscribe(waveForm => oscillator2.oscillatorNode.type = waveForm as OscillatorType);

// TODO: Add optional enveloppe to these 2 combined
observeRange('#cutoff', 20000).subscribe(freq => lowpassFilter.frequency.value = freq);
observeRange('#resonance', 0).subscribe(q => lowpassFilter.Q.value = q);

// Apply note played
Observable.combineLatest(osc1Freq$.filter(f => f !== 0), osc2Freq$.filter(f => f !== 0), glide$)
    .subscribe(([osc1Freq, osc2Freq, glide]) => {
        setFreq(oscillator1.oscillatorNode, osc1Freq, glide);
        setFreq(oscillator2.oscillatorNode, osc2Freq, glide);
    });

drawOscilloscope('oscilloscope', analyser);


// Set oscillator freq
function setFreq(oscillatorNode: OscillatorNode, freq: number, glide: number) {
    oscillatorNode.frequency.cancelScheduledValues(audioCtx.currentTime);
    oscillatorNode.frequency.setValueAtTime(oscillatorNode.frequency.value, audioCtx.currentTime);
    oscillatorNode.frequency.linearRampToValueAtTime(freq, audioCtx.currentTime + glide);
}

// Envelope
function envGenOn(param: AudioParam, release: number) {
    param.cancelScheduledValues(audioCtx.currentTime);
    param.setValueAtTime(param.value, audioCtx.currentTime);
    param.linearRampToValueAtTime(0, audioCtx.currentTime + release); // Release
}

function envGenOff(param: AudioParam, target: number, attackTime: number, sustainLevel: number, decayTime: number) {
    param.cancelScheduledValues(audioCtx.currentTime);
    param.setValueAtTime(0, audioCtx.currentTime);
    param.linearRampToValueAtTime(target, audioCtx.currentTime + attackTime); // Attack
    param.linearRampToValueAtTime(Math.min(sustainLevel, target), audioCtx.currentTime + attackTime + decayTime); // Decay
}
