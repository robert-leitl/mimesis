
import { LookingGlassConfig, LookingGlassWebXRPolyfill } from '@lookingglass/webxr/dist/@lookingglass/webxr'
import { EmotionDetection } from './sketch/emotion-detection';
import { Sketch } from './sketch/sketch';
import { Pane } from 'tweakpane';
import { AudioEffects } from './sketch/audio-effects';

const config = LookingGlassConfig
config.tileHeight = 1024
config.numViews = 45
config.targetY = 0
config.targetZ = 0
config.targetX = 0
config.targetDiam = 1
config.fovy = (45 * Math.PI) / 180
new LookingGlassWebXRPolyfill()

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const debugParam = urlParams.get('debug');

let DEBUG = debugParam !== null;

if (process.env.NODE_ENV !== 'production') {
    // Only runs in development and will be stripped in production builds.
    DEBUG = true;
}

let sketch;
let resizeTimeoutId;
let startTimeout = 3000;

window.addEventListener('load', async () => {
    let isEmotionDetectionAvailable = false;

    let pane;
    if (DEBUG) {
        pane = new Pane({ title: 'Settings', expanded: false});
    }

    try {
        await EmotionDetection.startEmitionDetection(pane);
        isEmotionDetectionAvailable = true;
    } catch (e) {
        startTimeout = 100;
        console.error(e);
    }

    setTimeout(() => {
        const container = document.querySelector('#container');
        const startButton = document.querySelector('#start-button');
        const intro = document.querySelector('#intro');
        sketch = new Sketch(container, isEmotionDetectionAvailable ? EmotionDetection : null, pane);
        audioEffects = new AudioEffects(container, isEmotionDetectionAvailable ? EmotionDetection : null, pane);

        sketch.oninit = () => {
            startButton.style.opacity = 1;
            document.body.removeChild(document.body.querySelector('#loader'));

            startButton.addEventListener('click', () => {
                document.body.removeChild(startButton);
                document.body.removeChild(intro);
                sketch.run();
                audioEffects.run();
            });
        }
    }, startTimeout);
});

window.addEventListener('resize', () => {
    if (sketch) {
        if (resizeTimeoutId)
            clearTimeout(resizeTimeoutId);

        resizeTimeoutId = setTimeout(() => {
            resizeTimeoutId = null;
            sketch.updateSize();
        }, 300);
    }
});
