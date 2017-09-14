export function makeOscillator(
    audioCtx: AudioContext,
    initialValue = 440,
    initialWaveForm: OscillatorType = 'sawtooth'
): { oscillatorNode: OscillatorNode, gainNode: GainNode } {

    const gain = audioCtx.createGain();

    const oscillator = audioCtx.createOscillator();
    oscillator.type = initialWaveForm;
    oscillator.frequency.value = initialValue; // value in hertz
    oscillator.connect(gain);
    oscillator.start();

    return { oscillatorNode: oscillator, gainNode: gain };
}
