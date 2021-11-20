import { EmotionDetection } from './sketch/emotion-detection';
import { Sketch } from './sketch/sketch';
import { Pane } from 'tweakpane';

const DEBUG = true;

let sketch;
let resizeTimeoutId;
let startTimeout = 3000;

window.addEventListener('load', async () => {
    let isEmotionDetectionAvailable = false;

    let pane;
    if (DEBUG) {
        pane = new Pane({ title: 'Settings' });
    }

    try {
        await EmotionDetection.startEmitionDetection(pane);
        isEmotionDetectionAvailable = true;
    } catch (e) {
        startTimeout = 0;
        console.error(e);
    }

    setTimeout(() => {
        document.body.removeChild(document.body.querySelector('#loader'));
        const container = document.body;
        sketch = new Sketch(container, isEmotionDetectionAvailable ? EmotionDetection : null, pane);
        sketch.oninit = () => {
            sketch.animate(); 
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


