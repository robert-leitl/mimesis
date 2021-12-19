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
            error => reject(new Error('get user media falied')));
        }
        else {
            reject(new Error('no user media available'));
        }
    });
}

const emotions = [ 'angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise' ];
const emotionProbability = emotions.reduce((map, label) => ({...map, [label]: 0}), {});
emotionProbability.neutral = 1;
currentEmotion = 'neutral';
let emotionModel = null;
let model = null;

const EmotionDetectionResult = {
    emotionProbability,
    currentEmotion
};

async function predictEmotion( points ) {
    let result = tf.tidy( () => {
        const xs = tf.stack( [ tf.tensor1d( points ) ] );
        return emotionModel.predict( xs );
    });
    let prediction = await result.data();
    result.dispose();
    // remove disgust
    prediction[1] = 0;
    /*prediction[2] *= 0.2;
    prediction[5] *= 3;*/
    // Get the index of the maximum value
    let id = prediction.indexOf( Math.max( ...prediction ) );
    EmotionDetectionResult.currentEmotion = emotions[id];
    prediction.forEach((p, i) => {
        emotionProbability[emotions[i]] = p;
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
    }

    setTimeout(trackFace, 300);
}

const startEmitionDetection = async (pane) => {
    return setupWebcam()
        .then(async () => {
            if (pane) {
                paneFolder = pane.addFolder({ title: 'Emotion Detection ', expand: true });
                paneFolder.addMonitor(emotionProbability, 'angry', { view: 'graph', min: 0, max: 1, });
                paneFolder.addMonitor(emotionProbability, 'fear', { view: 'graph', min: 0, max: 1, });
                paneFolder.addMonitor(emotionProbability, 'happy', { view: 'graph', min: 0, max: 1, });
                paneFolder.addMonitor(emotionProbability, 'neutral', { view: 'graph', min: 0, max: 1, });
                paneFolder.addMonitor(emotionProbability, 'sad', { view: 'graph', min: 0, max: 1, });
                paneFolder.addMonitor(emotionProbability, 'surprise', { view: 'graph', min: 0, max: 1, });
            }

            webcamVideoElement.play();

            // Load Face Landmarks Detection
            model = await faceLandmarksDetection.load(
                faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
            );
            // Load Emotion Detection
            emotionModel = await tf.loadLayersModel('./model/facemo.json');

            trackFace();
        });
};

export const EmotionDetection = {
    startEmitionDetection,
    result: EmotionDetectionResult
};