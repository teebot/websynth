export function makeOscillator(audioCtx: AudioContext, initialValue = 440, initialWaveForm: OscillatorType = 'sawtooth'): OscillatorNode {
    const oscillator = audioCtx.createOscillator();
    oscillator.type = initialWaveForm;
    oscillator.frequency.value = initialValue; // value in hertz
    oscillator.connect(audioCtx.destination);
    return oscillator;
}