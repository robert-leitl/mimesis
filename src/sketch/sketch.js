import {
    BoxBufferGeometry,
    CubeTexture,
    FileLoader,
    IcosahedronBufferGeometry,
    IcosahedronGeometry,
    Mesh,
    MirroredRepeatWrapping,
    PerspectiveCamera,
    PlaneBufferGeometry,
    Scene,
    ShaderMaterial,
    SphereBufferGeometry,
    Texture,
    TextureLoader,
    Vector2,
    Vector3,
    WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VertexTangentsHelper } from 'three/examples/jsm/helpers/VertexTangentsHelper'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import { ReactionDiffusion } from './reaction-diffusion';
import * as dat from 'dat.gui';

import skinFragmentShader from '../shader/skin-fragment.glsl';
import skinVertexShader from '../shader/skin-vertex.glsl';
import cubeSkinFragmentShader from '../shader/cube-skin-fragment.glsl';
import cubeSkinVertexShader from '../shader/cube-skin-vertex.glsl';
import { CubeReactionDiffusion } from './cube-reaction-diffusion';

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

    #useCubeMap = true;

    constructor(container, emotionDetector, isDebugMode) {
        this.container = container;
        this.emotionDetector = emotionDetector;
        this.isDebugMode = isDebugMode;

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
        this.renderer = new WebGLRenderer();
        this.renderer.setPixelRatio(Math.min(1, window.devicePixelRatio));
        this.container.appendChild(this.renderer.domElement);

        if (this.#useCubeMap) {
            this.#initObjectCubeMap();
            this.cubeReactionDiffusion = new CubeReactionDiffusion(
                this.renderer, 
                this.isDebugMode ? this.gui : null, 
                this.emotionDetector !== null
            );
        } else {
            this.#initObject();
            this.reactionDiffusion = new ReactionDiffusion(
                this.renderer, 
                this.isDebugMode ? this.gui : null
            );
        }

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

        this.#initGui();

        if (this.oninit) this.oninit();
    }

    #initGui() {
        if (this.isDebugMode) {
            this.guiFolder = this.gui.addFolder('Skin Rendering');
            this.displacementControl = this.guiFolder.add(this.shaderMaterial.uniforms.uDisplacement, 'value', -0.1, 0.1, 0.001);
            this.displacementControl.name('Displacement');

            this.guiFolder.open();
        }
    }

    #initObject() {
        //const geometry = new BoxBufferGeometry(0.5, 0.5, 0.5);
        //const geometry = new SphereBufferGeometry(0.5);
        //const geometry = new IcosahedronBufferGeometry(0.5, 30);
        const geometry = new PlaneBufferGeometry(1, 1);
        this.shaderMaterial = new ShaderMaterial({
            uniforms: {
                uTime: { value: 1.0 },
                uResolution: { value: new Vector2() },
                uMouse: { value: new Vector2() },
                uTexture: { value: this.texture },
                uCubeMap: { value: null },
                uDisplacement: { value: 0 }
            },
            vertexShader: skinVertexShader,
            fragmentShader: skinFragmentShader
        });

        const mesh = new Mesh(geometry, this.shaderMaterial);
        this.scene.add(mesh);
    }

    #initObjectCubeMap() {
        const geometry = new IcosahedronBufferGeometry(0.3, 60);

        /*const geometry = new BoxBufferGeometry(1, 1, 1, 10, 10, 10);
        const radius = 0.4;
        const positions = geometry.attributes.position;
        const normals = geometry.attributes.normal;
        const l = positions.count * positions.itemSize;
        for(let i=0; i<l; i+=positions.itemSize) {
            const v = new Vector3(
                positions.array[i + 0],
                positions.array[i + 1],
                positions.array[i + 2]
            );
            v.normalize();
            normals.array[i + 0] = v.x;
            normals.array[i + 1] = v.y;
            normals.array[i + 2] = v.z;

            v.multiplyScalar(radius);
            positions.array[i + 0] = v.x;
            positions.array[i + 1] = v.y;
            positions.array[i + 2] = v.z;
        }
        //geometry.computeVertexNormals();
        geometry.computeTangents();
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.normal.needsUpdate = true;
        geometry.attributes.tangent.needsUpdate = true;*/

        this.shaderMaterial = new ShaderMaterial({
            uniforms: {
                uTime: { value: 1.0 },
                uResolution: { value: new Vector2() },
                uMouse: { value: new Vector2() },
                uCubeMap: { value: null },
                uDisplacement: { value: .01 }
            },
            vertexShader: cubeSkinVertexShader,
            fragmentShader: cubeSkinFragmentShader
        });

        const mesh = new Mesh(geometry, this.shaderMaterial);
        this.scene.add(mesh);

        /*const helper = new VertexTangentsHelper(mesh, 0.01);
        this.scene.add(helper);
        this.scene.add(mesh);

        const helper2 = new VertexNormalsHelper(mesh, 0.05, 0xff0000);
        this.scene.add(helper2);*/
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
        if (this.#useCubeMap) {
            const reactionDiffusionCubeMap = this.cubeReactionDiffusion.compute(
                this.documentPointerPosition, 
                this.#time,
                this.#emotionParms.dA,
                this.#emotionParms.dB,
                this.#emotionParms.feed,
                this.#emotionParms.kill
            );
        
            this.shaderMaterial.uniforms.uCubeMap.value = reactionDiffusionCubeMap;
        } else {
            const reactionDiffusionTexture = this.reactionDiffusion.compute(
                this.documentPointerPosition, 
                this.#time,
                this.#emotionParms.dA,
                this.#emotionParms.dB,
                this.#emotionParms.feed,
                this.#emotionParms.kill
            );
        
            this.shaderMaterial.uniforms.uTexture.value = reactionDiffusionTexture;
        }
    
        this.#render();

        requestAnimationFrame(() => this.animate());
    }

    #animationEmotionParams() {
        if (!this.emotionDetector) return;

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
