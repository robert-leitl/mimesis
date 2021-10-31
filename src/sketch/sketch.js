import {
    FileLoader,
    Mesh,
    PerspectiveCamera,
    PlaneBufferGeometry,
    Scene,
    ShaderMaterial,
    Texture,
    TextureLoader,
    Vector2,
    WebGLRenderer
} from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ReactionDiffusion } from './reaction-diffusion';
import * as dat from 'dat.gui';

import skinFragmentShader from '../shader/skin-fragment.glsl';
import skinVertexShader from '../shader/skin-vertex.glsl';

export class Sketch {
    oninit;
    documentPointerPosition = new Vector2();

    #time = 0;
    #isDestroyed = false;

    #emotionParamTargets = {
        //angry:      { dA: 0.62, dB: 0.72, feed: 0.0240, kill: 0.0500, displacement: 1.0 },
        angry:      { dA: 1.00, dB: 0.59, feed: 0.0200, kill: 0.0515, displacement: 1.0 },
        fear:       { dA: 1.00, dB: 0.23, feed: 0.0265, kill: 0.0650, displacement: 0.9 },
        //happy:      { dA: 0.70, dB: 0.50, feed: 0.0200, kill: 0.0490, displacement: 0.2 },
        happy:      { dA: 0.75, dB: 0.46, feed: 0.0540, kill: 0.0615, displacement: 0.2 },
        neutral:    { dA: 1.00, dB: 0.45, feed: 0.0375, kill: 0.0575, displacement: 0.1 },
        sad:        { dA: 0.72, dB: 0.19, feed: 0.0375, kill: 0.0605, displacement: -.2 },
        //surprise:   { dA: 1.00, dB: 0.54, feed: 0.0355, kill: 0.0640, displacement: 0.3 }
        surprise:   { dA: 0.70, dB: 0.16, feed: 0.0540, kill: 0.0615, displacement: 0.3 }
    };
    #emotionParms = { ...this.#emotionParamTargets.neutral };

    constructor(container, emotionDetector) {
        this.container = container;
        this.emotionDetector = emotionDetector;

        const assets = [
            new TextureLoader().loadAsync(new URL('../assets/test.png', import.meta.url))
        ];

        Promise.all(assets).then((res) => {
            this.texture = res[0];
            this.#init();
        });

        this.gui = new dat.GUI();
    }

    #init() {
        this.camera = new PerspectiveCamera(
            45,
            this.container.offsetWidth / this.container.offsetHeight,
            0.1,
            100
        );
        this.camera.position.z = 2;
        this.scene = new Scene();
        this.#initObject();
        this.renderer = new WebGLRenderer();
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.reactionDiffusion = new ReactionDiffusion(this.renderer, this.gui);

        this.updateSize();

        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.controls.update();

        document.onpointermove = (e) => {
            this.shaderMaterial.uniforms.uMouse.value.x = e.pageX;
            this.shaderMaterial.uniforms.uMouse.value.y = e.pageY;

            this.documentPointerPosition.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.documentPointerPosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };

        if (this.oninit) this.oninit();
    }

    #initObject() {
        const geometry = new PlaneBufferGeometry(2, 2);
        this.shaderMaterial = new ShaderMaterial({
            uniforms: {
                uTime: { value: 1.0 },
                uResolution: { value: new Vector2() },
                uMouse: { value: new Vector2() },
                uTexture: { value: this.texture }
            },
            vertexShader: skinVertexShader,
            fragmentShader: skinFragmentShader
        });

        const mesh = new Mesh(geometry, this.shaderMaterial);
        this.scene.add(mesh);
    }

    updateSize() {
        this.renderer.setSize(
            this.container.offsetWidth,
            this.container.offsetHeight
        );
        this.shaderMaterial.uniforms.uResolution.value.x = this.renderer.domElement.width;
        this.shaderMaterial.uniforms.uResolution.value.y = this.renderer.domElement.height;
        this.camera.aspect =
            this.container.offsetWidth / this.container.offsetHeight;
        this.camera.updateProjectionMatrix();
    }

    animate() {
        if (this.#isDestroyed) return;

        this.#time += 0.05;

        this.#animationEmotionParams();

        this.controls.update();
        this.shaderMaterial.uniforms.uTexture.value = this.reactionDiffusion.compute(
            this.documentPointerPosition, 
            this.#time,
            this.#emotionParms.dA,
            this.#emotionParms.dB,
            this.#emotionParms.feed,
            this.#emotionParms.kill
        );
        this.#render();

        requestAnimationFrame(() => this.animate());
    }

    #animationEmotionParams() {
        const targetEmotionParams = { dA: 0, dB: 0, feed: 0, kill: 0, displacement: 0 };
        const paramKeys = Object.keys(targetEmotionParams);
        let propabilitySum = 0;
        Object.entries(this.#emotionParamTargets).forEach(([key, params]) => {
            const weight = Math.pow(this.emotionDetector.emotionProbability[key], 2)
            paramKeys.forEach(paramKey => {
                targetEmotionParams[paramKey] += params[paramKey] * weight
            });
            propabilitySum += weight;
        });

        paramKeys.forEach(paramKey => {
            targetEmotionParams[paramKey] /= propabilitySum;
            this.#emotionParms[paramKey] += (targetEmotionParams[paramKey] - this.#emotionParms[paramKey]) / 10;
        });
    }

    #render() {
        this.shaderMaterial.uniforms.uTime.value = this.#time;
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this.#isDestroyed = true;
    }
}
