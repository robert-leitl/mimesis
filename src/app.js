import { EmotionDetection } from './sketch/emotion-detection';
import { Sketch } from './sketch/sketch';

const DEBUG = true;

let sketch;
let resizeTimeoutId;

window.addEventListener('load', async () => {
    try {
        await EmotionDetection.startEmitionDetection(DEBUG);
    } catch (e) {
        console.error(e);
    }

    setTimeout(() => {
        document.body.removeChild(document.body.querySelector('#loader'));
        const container = document.body;
        sketch = new Sketch(container, EmotionDetection);
        sketch.oninit = () => {
            sketch.animate(); 
        }
    }, 3000);
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


