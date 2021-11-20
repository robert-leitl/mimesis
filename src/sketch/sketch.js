import {
    BoxBufferGeometry,
    CubeTexture,
    FileLoader,
    IcosahedronBufferGeometry,
    IcosahedronGeometry,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
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
import * as dat from 'dat.gui';
import { Pane } from 'tweakpane';

import cubeSkinFragmentShader from '../shader/cube-skin-fragment.glsl';
import cubeSkinVertexShader from '../shader/cube-skin-vertex.glsl';
import { CubeReactionDiffusion } from './cube-reaction-diffusion';

export class Sketch {
    oninit;
    documentPointerPosition = new Vector2();

    #time = 0;
    #isDestroyed = false;

    #emotionParamTargets = {
        angry:      { dA: 1.00, dB: 0.59, feed: 0.0200, kill: 0.0515, displacement: 0.05 },
        fear:       { dA: 1.00, dB: 0.23, feed: 0.0265, kill: 0.0650, displacement: 0.03 },
        happy:      { dA: 0.75, dB: 0.46, feed: 0.0540, kill: 0.0615, displacement: 0.02 },
        neutral:    { dA: 1.00, dB: 0.45, feed: 0.0375, kill: 0.0575, displacement: 0.01 },
        sad:        { dA: 0.72, dB: 0.19, feed: 0.0375, kill: 0.0605, displacement: 0.01 },
        surprise:   { dA: 0.70, dB: 0.16, feed: 0.0540, kill: 0.0615, displacement: -0.01 }
    };
    #emotionParms = { ...this.#emotionParamTargets.neutral };

    constructor(container, emotionDetector, isDebugMode) {
        this.container = container;
        this.emotionDetector = emotionDetector;
        this.isDebugMode = isDebugMode;

        const assets = [
            new TextureLoader().loadAsync(new URL('../assets/normal_leather.jpg', import.meta.url)),
            new TextureLoader().loadAsync(new URL('../assets/matcap.png', import.meta.url))
        ];

        Promise.all(assets).then((res) => {
            this.normalTexture = res[0];
            this.matcapTexture = res[1];
            this.#init();
        });

        if (this.isDebugMode) {
            this.pane = new Pane({ title: 'Settings' });
        }
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

        this.#initObject();
        this.cubeReactionDiffusion = new CubeReactionDiffusion(
            this.renderer, 
            this.pane, 
            this.emotionDetector !== null
        );
    
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

            if (this.cubeReactionDiffusion) {
                this.cubeReactionDiffusion.pointerPosition = this.documentPointerPosition;
            }
        };

        this.#initGui();

        if (this.oninit) this.oninit();
    }

    #initGui() {
        if (this.isDebugMode) {
            this.paneFolder = this.pane.addFolder({ title: 'Skin Rendering', expanded: true });
            this.paneFolder.addInput(
                this.shaderMaterial.uniforms.uDisplacement, 
                'value',
                { label: 'displacement', min: -0.03, max: 0.03, step: 0.001 }
            );
        }
    }

    #initObject() {
        //const geometry = new SphereBufferGeometry(0.3, 64, 64);

        // make a sphere geometry from a box by moving each
        // vertex to the length of the radius
        const geometry = new BoxBufferGeometry(1, 1, 1, 60, 60, 60);
        const radius = 0.3;
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
        geometry.computeTangents();
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.normal.needsUpdate = true;
        geometry.attributes.tangent.needsUpdate = true;


        this.shaderMaterial = new ShaderMaterial({
            uniforms: {
                uTime: { value: 1.0 },
                uResolution: { value: new Vector2() },
                uMouse: { value: new Vector2() },
                uCubeMap: { value: null },
                uDisplacement: { value: .02 },
                uNormalTexture: { value: this.normalTexture },
                uMatcapTexture: { value: this.matcapTexture }
            },
            vertexShader: cubeSkinVertexShader,
            fragmentShader: cubeSkinFragmentShader
        });

        this.mesh = new Mesh(geometry, this.shaderMaterial);
        this.scene.add(this.mesh);
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
        
        const reactionDiffusionCubeMap = this.cubeReactionDiffusion.compute(
            this.documentPointerPosition, 
            this.#time,
            this.#emotionParms.dA,
            this.#emotionParms.dB,
            this.#emotionParms.feed,
            this.#emotionParms.kill
        );

        this.shaderMaterial.uniforms.uCubeMap.value = reactionDiffusionCubeMap;
    
        if (!this.isDebugMode) {
            this.shaderMaterial.uniforms.uDisplacement.value = this.#emotionParms.displacement;
        }

        this.scene.rotation.y -= 0.003;
        this.mesh.position.y = Math.sin(this.#time / 3) * 0.03;
    
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
