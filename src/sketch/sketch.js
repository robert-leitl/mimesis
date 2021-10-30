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

    #isDestroyed = false;

    constructor(container) {
        this.container = container;

        const assets = [
            new TextureLoader().loadAsync(new URL('../assets/test.png', import.meta.url))
        ];

        Promise.all(assets).then((res) => {
            this.texture = res[0];
            this.init();
        });

        this.gui = new dat.GUI();
    }

    init() {
        this.camera = new PerspectiveCamera(
            45,
            this.container.offsetWidth / this.container.offsetHeight,
            0.1,
            100
        );
        this.camera.position.z = 2;
        this.scene = new Scene();
        this.initObject();
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

    initObject() {
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

        this.controls.update();
        this.shaderMaterial.uniforms.uTexture.value = this.reactionDiffusion.compute(this.documentPointerPosition);
        this.render();

        requestAnimationFrame(() => this.animate());
    }

    render() {
        this.shaderMaterial.uniforms.uTime.value += 0.05;
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this.#isDestroyed = true;
    }
}
