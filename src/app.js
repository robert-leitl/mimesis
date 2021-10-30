import { Sketch } from './sketch/sketch';

let sketch;
let resizeTimeoutId;

window.addEventListener('load', () => {
    const container = document.body;
    sketch = new Sketch(container);
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


