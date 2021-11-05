import { DataTexture, Mesh, OrthographicCamera, PlaneBufferGeometry, Scene, ShaderMaterial, WebGLRenderTarget, Vector2, LinearFilter, FloatType, MirroredRepeatWrapping, RGBAFormat, RGBFormat, RepeatWrapping, SphereBufferGeometry, CubeCamera, WebGLCubeRenderTarget, BackSide, CubeTexture, IcosahedronBufferGeometry, BoxBufferGeometry, BoxGeometry, Vector3 } from "three";
import * as dat from 'dat.gui';

import reactionDiffusionVertexShader from '../shader/cube-reaction-diffusion-vertex.glsl';
import reactionDiffusionFragmentShader from '../shader/cube-reaction-diffusion-fragment.glsl';

export class CubeReactionDiffusion {

    useEmotions = true;
    
    constructor(renderer, gui, isEmotionDetectionAvailable) {
        this.renderer = renderer;
        this.computeStepsInFrame = 15;
        this.currentRenderTargetIndex = 0;
        this.computeSize = 64;
        this.useEmotions = isEmotionDetectionAvailable;

        this.#init();

        if (gui) {
            this.guiFolder = gui.addFolder('Reaction Diffusion');
            this.diffusionAControl = this.guiFolder.add(this.computeMaterial.uniforms.uDiffusionA, 'value', 0, 1, 0.01);
            this.diffusionAControl.name('A');
            this.diffusionBControl = this.guiFolder.add(this.computeMaterial.uniforms.uDiffusionB, 'value', 0, 1, 0.01);
            this.diffusionBControl.name('B');
            this.feedRateControl = this.guiFolder.add(this.computeMaterial.uniforms.uFeedRate, 'value', 0.02, 0.07, 0.0005);
            this.feedRateControl.name('Feed Rate');
            this.killRateAControl = this.guiFolder.add(this.computeMaterial.uniforms.uKillRate, 'value', 0.02, 0.07, 0.0005);
            this.killRateAControl.name('Kill Rate');
            this.guiFolder.add(this, 'useEmotions');
            this.guiFolder.open();
        }
    }

    compute(pointer, time, dA, dB, feed, kill) {
        this.computeMaterial.uniforms.uPointer.value = pointer;
        this.computeMaterial.uniforms.uTime.value = time;

        if (this.useEmotions) {
            this.computeMaterial.uniforms.uDiffusionA.value = dA;
            this.computeMaterial.uniforms.uDiffusionB.value = dB;
            this.computeMaterial.uniforms.uFeedRate.value = feed;
            this.computeMaterial.uniforms.uKillRate.value = kill;
        }

        for (let i = 0; i < this.computeStepsInFrame; i++) {
            const nextRenderTargetIndex = this.currentRenderTargetIndex === 0 ? 1 : 0;

            this.computeMaterial.uniforms.uCubeMap.value = this.computeRenderTargets[
                this.currentRenderTargetIndex
            ].texture;

            this.computeCamera.renderTarget = this.computeRenderTargets[nextRenderTargetIndex];
            this.computeCamera.update(this.renderer, this.computeScene);

            this.currentRenderTargetIndex = nextRenderTargetIndex;
        }

        this.renderer.setRenderTarget(null);

        return this.computeRenderTargets[this.currentRenderTargetIndex].texture
    }

    #init() {
        this.computeMaterial = new ShaderMaterial({
            uniforms: {
                uResolution: { value: new Vector2(this.computeSize, this.computeSize) },
                uCubeMap: { value: new CubeTexture() },
                uPointer: { value: new Vector2() },
                uTime: { value: 0 },
                uDiffusionA: { value: 1 },
                uDiffusionB: { value: 0.45 },
                uFeedRate: { value: 0.0375 },
                uKillRate: { value: 0.0575 }
            },
            vertexShader: reactionDiffusionVertexShader,
            fragmentShader: reactionDiffusionFragmentShader,
            side: BackSide
        });
        //const geometry = new SphereBufferGeometry(1, 10, 10);
        const geometry = new BoxBufferGeometry(1, 1, 1, 20, 20, 20);
        const radius = 1;
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
        this.computeMesh = new Mesh(geometry, this.computeMaterial);
        this.computeScene = new Scene();
        this.computeScene.add(this.computeMesh);
        this.computeRenderTargets = Array(2).fill(undefined).map(
            () =>
                new WebGLCubeRenderTarget(this.computeSize, {
                    minFilter: LinearFilter,
                    magFilter: LinearFilter,
                    type: FloatType,
                    wrapS: RepeatWrapping,
                    wrapT: RepeatWrapping,
                    depthBuffer: false,
                    stencilBuffer: false
                })
        );
        const initRenderTarget = this.computeRenderTargets[0];
        this.computeCamera = new CubeCamera(0.25, 1, initRenderTarget);
    }
}