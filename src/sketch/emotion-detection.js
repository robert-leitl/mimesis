import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

/**
 * Based on https://www.codeproject.com/Articles/5293493/Real-Time-Facial-Emotion-Detection-with-Webcam-in
 */

const webcamVideoElement = document.createElement('video');

async function setupWebcam() {
    return new Promise( ( resolve, reject ) => {
        const navigatorAny = navigator;
        navigator.getUserMedia = navigator.getUserMedia ||
        navigatorAny.webkitGetUserMedia || navigatorAny.mozGetUserMedia ||
        navigatorAny.msGetUserMedia;
        if( navigator.getUserMedia ) {
            navigator.getUserMedia( { video: true },
                stream => {
                    webcamVideoElement.srcObject = stream;
                    webcamVideoElement.addEventListener( "loadeddata", resolve, false );
                },
            error => reject());
        }
        else {
            reject();
        }
    });
}

const emotions = [ "angry", "disgust", "fear", "happy", "neutral", "sad", "surprise" ];
const emotionProbability = emotions.reduce((map, label) => ({...map, [label]: 0}), {});
const debugElm;
let emotionModel = null;
let model = null;

async function predictEmotion( points ) {
    let result = tf.tidy( () => {
        const xs = tf.stack( [ tf.tensor1d( points ) ] );
        return emotionModel.predict( xs );
    });
    let prediction = await result.data();
    result.dispose();
    // Get the index of the maximum value
    let id = prediction.indexOf( Math.max( ...prediction ) );
    prediction.forEach((p, i) => {
        emotionProbability[emotions[i]] = p;
        if (debugElm) {
            const value = debugElm.querySelector(`#${emotions[i]}`);
            value.style.width = `${p * 5}em`;
        }
    });
    return emotions[ id ];
}

async function trackFace() {
    const faces = await model.estimateFaces( {
        input: webcamVideoElement,
        returnTensors: false,
        flipHorizontal: false,
    });

    let points = null;
    faces.forEach( face => {
        // Draw the bounding box
        const x1 = face.boundingBox.topLeft[ 0 ];
        const y1 = face.boundingBox.topLeft[ 1 ];
        const x2 = face.boundingBox.bottomRight[ 0 ];
        const y2 = face.boundingBox.bottomRight[ 1 ];
        const bWidth = x2 - x1;
        const bHeight = y2 - y1;

        // Add just the nose, cheeks, eyes, eyebrows & mouth
        const features = [
            "noseTip",
            "leftCheek",
            "rightCheek",
            "leftEyeLower1", "leftEyeUpper1",
            "rightEyeLower1", "rightEyeUpper1",
            "leftEyebrowLower", //"leftEyebrowUpper",
            "rightEyebrowLower", //"rightEyebrowUpper",
            "lipsLowerInner", //"lipsLowerOuter",
            "lipsUpperInner", //"lipsUpperOuter",
        ];
        points = [];
        features.forEach( feature => {
            face.annotations[ feature ].forEach( x => {
                points.push( ( x[ 0 ] - x1 ) / bWidth );
                points.push( ( x[ 1 ] - y1 ) / bHeight );
            });
        });
    });

    if( points ) {
        let emotion = await predictEmotion( points );
        //console.log( `Detected: ${emotion}` );
    }
    else {
        //console.log( "No Face" );
    }

    setTimeout(trackFace, 300);
}

export const startEmitionDetection = async (debug) => {
    await setupWebcam();

    webcamVideoElement.play();

    // Load Face Landmarks Detection
    model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
    );
    // Load Emotion Detection
    emotionModel = await tf.loadLayersModel('./model/facemo.json');

    trackFace();

    if (debug) {
        debugElm = document.createElement('ul');
        emotions.forEach(label => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            const l = document.createElement('div');
            l.innerText = label;
            l.style.width = '4em';
            l.style.textAlign = 'right';
            l.style.marginRight = '0.5em';
            li.appendChild(l);
            const value = document.createElement('div');
            value.id = label;
            value.style.backgroundColor = '#ff4444';
            value.style.height = '1em';
            value.style.width = '0em';
            li.appendChild(value);
            debugElm.appendChild(li);
        });
        debugElm.style.width = '10em';
        debugElm.style.backgroundColor = '#000';
        debugElm.style.position = 'absolute';
        debugElm.style.top = 0;
        debugElm.style.left = 0;
        debugElm.style.padding = '1em';
        debugElm.style.margin = 0;
        debugElm.style.color = '#eee';
        debugElm.style.listStyle = 'none';
        document.body.appendChild(debugElm);
    }
};