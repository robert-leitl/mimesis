import { DataTexture, Mesh, OrthographicCamera, PlaneBufferGeometry, Scene, ShaderMaterial, WebGLRenderTarget, Vector2, LinearFilter, FloatType, MirroredRepeatWrapping, RGBAFormat, RGBFormat } from "three";
import * as dat from 'dat.gui';

import reactionDiffusionVertexShader from '../shader/reaction-diffusion-vertex.glsl';
import reactionDiffusionFragmentShader from '../shader/reaction-diffusion-fragment.glsl';

export class ReactionDiffusion {
    
    constructor(renderer, gui) {
        this.renderer = renderer;
        this.computeStepsInFrame = 50;
        this.currentRenderTargetIndex = 0;
        this.computeSize = 128;

        this.#init();

        if (gui) {
            this.guiFolder = gui.addFolder('Reaction Diffusion');
            const diffusionAControl = this.guiFolder.add(this.computeMaterial.uniforms.uDiffusionA, 'value', 0, 1, 0.01);
            diffusionAControl.name('A');
            const diffusionBControl = this.guiFolder.add(this.computeMaterial.uniforms.uDiffusionB, 'value', 0, 1, 0.01);
            diffusionBControl.name('B');
            const feedRateControl = this.guiFolder.add(this.computeMaterial.uniforms.uFeedRate, 'value', 0, 0.1, 0.001);
            feedRateControl.name('Feed Rate');
            const killRateAControl = this.guiFolder.add(this.computeMaterial.uniforms.uKillRate, 'value', 0, 0.1, 0.001);
            killRateAControl.name('Kill Rate');
        }
    }

    compute(pointer) {
        this.computeMaterial.uniforms.uPointer.value = pointer;

        for (let i = 0; i < this.computeStepsInFrame; i++) {
            const nextRenderTargetIndex = this.currentRenderTargetIndex === 0 ? 1 : 0;

            this.computeMaterial.uniforms.uTexture.value = this.computeRenderTargets[
                this.currentRenderTargetIndex
            ].texture;
            this.renderer.setRenderTarget(this.computeRenderTargets[nextRenderTargetIndex]);
            this.renderer.render(this.computeScene, this.computeCamera);

            this.currentRenderTargetIndex = nextRenderTargetIndex;
        }

        this.renderer.setRenderTarget(null);

        return this.computeRenderTargets[this.currentRenderTargetIndex].texture
    }

    #init() {
        this.computeMaterial = new ShaderMaterial({
            uniforms: {
                uResolution: { value: new Vector2(this.computeSize, this.computeSize) },
                uTexture: { value: null },
                uPointer: { value: new Vector2() },
                uDiffusionA: { value: 0.9 },
                uDiffusionB: { value: 0.5 },
                uFeedRate: { value: 0.045 },
                uKillRate: { value: 0.06 }
            },
            vertexShader: reactionDiffusionVertexShader,
            fragmentShader: reactionDiffusionFragmentShader
        });
        const geometry = new PlaneBufferGeometry(2, 2);
        this.computeMesh = new Mesh(geometry, this.computeMaterial);
        this.computeScene = new Scene();
        this.computeScene.add(this.computeMesh);
        this.computeCamera = new OrthographicCamera(1, 1, 1, 1);
        this.computeRenderTargets = Array(2).fill(undefined).map(
            () =>
                new WebGLRenderTarget(this.computeSize, this.computeSize, {
                    minFilter: LinearFilter,
                    magFilter: LinearFilter,
                    type: FloatType,
                    wrapS: MirroredRepeatWrapping,
                    wrapT: MirroredRepeatWrapping,
                    depthBuffer: false,
                    stencilBuffer: false
                })
        );

        // initialize the reaction diffusion system by manually creating an inital texture
        // and rendering it to the first render target

        /**
         * This material is necessary, because in order to manually update the
         * texture of a render target, one has to render it. The init material
         * just takes the manually initializewd texture and renders it to the target.
         */
         const initMaterial = new ShaderMaterial({
            uniforms: {
                uResolution: {
                    value: new Vector2(this.computeSize, this.computeSize)
                },
                uTexture: { value: null }
            },
            vertexShader: `
            uniform vec2 uResolution;
            void main() {
                gl_Position = vec4(position, 1.0);
            }`,
            fragmentShader: `
            uniform sampler2D uTexture;
            uniform vec2 uResolution;
            void main() {
                vec2 st = gl_FragCoord.xy / uResolution.xy;
                gl_FragColor = texture2D( uTexture, st);
            }`
        });

        // create the initial texture data
        const initRenderTarget = this.computeRenderTargets[0];
        const buffer = new Float32Array(initRenderTarget.width * initRenderTarget.height * 4);
        this.renderer.readRenderTargetPixels(
            initRenderTarget,
            0,
            0,
            initRenderTarget.width,
            initRenderTarget.height,
            buffer
        );
        const texture = new DataTexture(
            buffer,
            initRenderTarget.width,
            initRenderTarget.height,
            RGBFormat,
            FloatType
        );
        // set the pixel values for the init texture data
        const w = texture.image.width;
        const h = texture.image.height;
        const w2 = w / 2;
        const h2 = h / 2;
        const seedSize = 2;
        const pixels = texture.image.data;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const pixelIndex = (y * w + x) * 3;
                pixels[pixelIndex + 0] = 1; // A
                pixels[pixelIndex + 1] = 0; 
                pixels[pixelIndex + 2] = 0; // B

                if (y > h2 - seedSize && y < h2 + seedSize && x > w2 - seedSize && x < w2 + seedSize) {
                    pixels[pixelIndex + 2] = 1; // B
                }
            }
        }
        // render the texture data to the first render target
        texture.needsUpdate = true;
        initMaterial.uniforms.uTexture.value = texture;
        initMaterial.uniforms.uResolution.value.x = this.computeSize;
        initMaterial.uniforms.uResolution.value.y = this.computeSize;
        this.computeMesh.material = initMaterial;
        this.renderer.setRenderTarget(initRenderTarget);
        this.renderer.render(this.computeScene, this.computeCamera);
        this.renderer.setRenderTarget(null);
        this.computeMesh.material = this.computeMaterial;
        initMaterial.uniforms.uTexture.value = null;
    }
}