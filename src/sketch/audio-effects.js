import * as Tone from 'tone';

export class AudioEffects {
    oninit;

    #moodIndex = 0;

    #isDestroyed = false;

    #EMOTION_CHORD_NOTES = {
        angry:      ['F#4', 'A4', 'C#5', 'A5', 'F#6'],
        fear:       ['E3', 'E4', 'B4', 'F4', 'A5'],
        happy:      ['A3', 'A4', 'E4', 'G#4', 'C#5'],
        neutral:    ['E3', 'A3', 'A4', 'E4', 'G4'],
        sad:        ['B3', 'F#3', 'D4', 'B4', 'F#4'],
        surprise:    ['D3', 'D4', 'A4', 'C4', 'F#4']
    }

    #NOISE_FILTER_FREQUENCIES = {
        angry:      800,
        fear:       400,
        happy:      200,
        neutral:    200,
        sad:        200,
        surprise:    300
    }

    #BPMS = {
        angry:      530,
        fear:       280,
        happy:      120,
        neutral:    120,
        sad:        80,
        surprise:    170
    }

    constructor(container, emotionDetector, pane) {
        this.container = container;
        this.emotionDetector = emotionDetector;
        this.pane = pane;

        this.#init();
    }

    resize() {}

    async run() {
        await Tone.loaded();

        if (Tone.context.state !== 'running') 
            Tone.context.resume();

        Tone.Transport.bpm.value = 120;
        Tone.Transport.start();

        this.backgroundNoise.start();
        this.sparkLoop.start();
        this.changeAccentuationLoop.start();
        this.backgroundMelodyLoop1.start();
        this.backgroundMelodyLoop2.start();
        this.backgroundMelodyLoop3.start();

        // fade in all audio
        this.masterVolume.volume.rampTo(-10, 3);

        this.emotionsFolder.disabled = false;

        this.emotion = 'neutral';
    }

    destroy() {
        this.#isDestroyed = true;
    }

    async #init() {

        this.#initMasterVolume();

        this.#initMelodyEffects();

        this.#initBackgroundNoise();

        this.#initElectroSpark();

        this.#initChangeAccentuationLoop();

        this.#initBackgroundMelody();

        this.#initTweakpane();

        if (this.oninit) this.oninit();
    }

    #initTweakpane() {
        if(this.pane) {
            this.emotionsFolder = this.pane.addFolder({ title: 'Audio Effect Tests', disabled: true });

            for(let key in this.#EMOTION_CHORD_NOTES) {
                const emotionButton = this.emotionsFolder.addButton({ title: key});
                emotionButton.on('click', () => this.emotion = key);
            }
        }
    }

    #initMasterVolume() {
        this.masterVolume = new Tone.Volume(-35);
        this.masterVolume.toDestination();
    }

    #initMelodyEffects() {
        this.reverb = new Tone.Reverb({ decay: 50 });
        const dist = new Tone.Distortion(0.1);
        this.reverb.connect(dist);
        dist.connect(this.masterVolume);
    }

    #initChangeAccentuationLoop() {
        const synth = new Tone.PolySynth(
            Tone.Synth,
            {
                oscillator : {
                    type : 'fatsawtooth',
                    count : 3,
                    spread : 10
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.1,
                    sustain: 0,
                    release: 0.1,
                    attackCurve : 'exponential'
                },
                volume: 5
            }
        );
        const crusher = new Tone.BitCrusher(2);
        const filter = new Tone.Filter(500, 'lowpass', -12);
        
        synth.connect(crusher);
        crusher.connect(filter);
        filter.connect(this.reverb);

        let oldEmotion;
        this.changeAccentuationLoop = new Tone.Loop(time => {

            if (this.emotionDetector) {
                this.emotion = (this.emotionDetector.result.currentEmotion);
                console.log(this.emotion);
            }

            if (this.emotion != oldEmotion) {
                const notes = this.#EMOTION_CHORD_NOTES[this.emotion];
                const noiseFreq = this.#NOISE_FILTER_FREQUENCIES[this.emotion];
                const bpm = this.#BPMS[this.emotion];

                if (notes && notes.length > 0) {
                    synth.triggerAttackRelease(notes.slice(1,4), '16n', time);
                }

                this.backgroundNoiseFilter.frequency.rampTo(noiseFreq, 1);

                Tone.Transport.bpm.rampTo(bpm, 2);

                oldEmotion = this.emotion;
            }
        }, '1:0');
    }

    #initBackgroundMelody() {
        const synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: {
                type: 'fatsine',
                count: 3,
                spread: 50
            },
            envelope: {
                attack: 0.1,
                decay: 0.1,
                sustain: 1,
                release: 1
            },
            volume: -12
        });
        
        synth.connect(this.reverb);

        this.backgroundMelodyLoop1 = new Tone.Loop(time => {
            const notes = this.#EMOTION_CHORD_NOTES[this.emotion];
            if (notes && notes.length > 0) {
                synth.triggerAttackRelease(notes[0], '1:1', time);
            }
        }, '2:0');

        this.backgroundMelodyLoop2 = new Tone.Loop(time => {
            const notes = this.#EMOTION_CHORD_NOTES[this.emotion];
            if (notes && notes.length > 2) {
                synth.triggerAttackRelease(notes[1], '0:3', time);
            }
        }, '3:1');

        this.backgroundMelodyLoop3 = new Tone.Loop(time => {
            const notes = this.#EMOTION_CHORD_NOTES[this.emotion];
            if (notes && notes.length > 2) {
                synth.triggerAttackRelease(notes[3], '0:1', time);
                synth.triggerAttackRelease(notes[1], '0:1', '+0:1');
                synth.triggerAttackRelease(notes[2], '0:1', '+0:2');
            }
        }, '2:3');
    }

    #initBackgroundNoise() {
        this.backgroundNoise = new Tone.Noise('pink');
        this.backgroundNoiseFilter = new Tone.Filter(200, 'lowpass');
        const noiseGain = new Tone.Gain(0.1);
        this.backgroundNoise.connect(noiseGain);
        this.backgroundNoise.connect(this.backgroundNoiseFilter);
        this.backgroundNoiseFilter.connect(this.masterVolume);
    }

    #initElectroSpark() {
        const synth = new Tone.Synth(
            {
                oscillator : {
                    type : 'square'
                },
                envelope: {
                    attack: '2n',
                    decay: 0.05,
                    sustain: 0.0,
                    release: 0.0
                },
                volume: 5
            }
          );
        const cheby = new Tone.Chebyshev(50);
        const panner = new Tone.Panner(0);
        synth.connect(cheby);
        cheby.connect(panner);
        panner.connect(this.masterVolume);
        this.sparkLoop = new Tone.Loop(time => {
            panner.pan.setValueAtTime(-1, time);
            panner.pan.rampTo(1, '0:0:8', time);
            synth.triggerAttackRelease('A2', '2n', time, 0.1)
        }, '2m');
    }
}
