import { EmotionDetection } from './sketch/emotion-detection';
import { Sketch } from './sketch/sketch';

const DEBUG = true;

let sketch;
let resizeTimeoutId;

window.addEventListener('load', async () => {
    EmotionDetection.startEmitionDetection(DEBUG);

    const container = document.body;
    sketch = new Sketch(container, EmotionDetection);
    sketch.oninit = () => {
        sketch.animate(); 
    }
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


