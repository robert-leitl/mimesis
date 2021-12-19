import { DataTexture, Mesh, OrthographicCamera, PlaneBufferGeometry, Scene, ShaderMaterial, WebGLRenderTarget, Vector2, LinearFilter, FloatType, MirroredRepeatWrapping, RGBAFormat, RGBFormat, RepeatWrapping, SphereBufferGeometry, CubeCamera, WebGLCubeRenderTarget, BackSide, CubeTexture, IcosahedronBufferGeometry, BoxBufferGeometry, BoxGeometry, Vector3 } from "three";

import reactionDiffusionVertexShader from '../shader/cube-reaction-diffusion-vertex.glsl';
import reactionDiffusionFragmentShader from '../shader/cube-reaction-diffusion-fragment.glsl';

export class CubeReactionDiffusion {

    useEmotions = true;
    usePointer = false;
    pointerPosition = new Vector2();
    
    constructor(renderer, pane, isEmotionDetectionAvailable) {
        this.renderer = renderer;
        this.computeStepsInFrame = 20;
        this.currentRenderTargetIndex = 0;
        this.computeSize = 64;
        this.useEmotions = isEmotionDetectionAvailable;
        this.usePointer = !this.useEmotions;

        this.#initCubeReactionDiffusion();

        if (pane) {
            this.guiFolder = pane.addFolder({ title: 'Reaction Diffusion', expanded: true });
            this.usePointerSwitch = this.guiFolder.addInput(this, 'usePointer', { label: 'pointer' });

            this.diffusionAControl = this.guiFolder.addInput(
                this.computeMaterial.uniforms.uDiffusionA, 
                'value', 
                { label: 'A', min: 0, max: 1, step: 0.01, disabled: this.usePointer }
            );
            this.diffusionBControl = this.guiFolder.addInput(
                this.computeMaterial.uniforms.uDiffusionB, 
                'value', 
                { label: 'B', min: 0, max: 1, step: 0.01, disabled: this.usePointer }
            );
            this.feedRateControl = this.guiFolder.addInput(
                this.computeMaterial.uniforms.uFeedRate, 
                'value', 
                { label: 'Feed Rate', min: 0.02, max: 0.07, step: 0.0005, disabled: this.usePointer }
            );
            this.killRateControl = this.guiFolder.addInput(
                this.computeMaterial.uniforms.uKillRate, 
                'value', 
                { label: 'Kill Rate', min: 0.02, max: 0.07, step: 0.0005, disabled: this.usePointer }
            );
            this.flowSpeedControl = this.guiFolder.addInput(
                this.computeMaterial.uniforms.uFlowSpeed, 
                'value', 
                { label: 'Flow Speed', min: 0.0, max: 0.002, step: 0.0001 }
            );
            
            this.usePointerSwitch.on('change', (e) => {
                this.diffusionAControl.disabled = e.value;
                this.diffusionBControl.disabled = e.value;
                this.feedRateControl.disabled = e.value;
                this.killRateControl.disabled = e.value;
            });
        }
    }

    compute(pointer, time, dA, dB, feed, kill, flowSpeed) {
        this.computeMaterial.uniforms.uPointer.value = pointer;
        this.computeMaterial.uniforms.uTime.value = time;

        if (this.useEmotions) {
            this.computeMaterial.uniforms.uDiffusionA.value = dA;
            this.computeMaterial.uniforms.uDiffusionB.value = dB;
            this.computeMaterial.uniforms.uFeedRate.value = feed;
            this.computeMaterial.uniforms.uKillRate.value = kill;
            this.computeMaterial.uniforms.uFlowSpeed.value = flowSpeed;
        } else if (this.usePointer) {
            this.computeMaterial.uniforms.uDiffusionA.value = 1;
            this.computeMaterial.uniforms.uDiffusionB.value += (Math.min(0.45, 0.4 + this.pointerPosition.x / 5) - this.computeMaterial.uniforms.uDiffusionB.value) / 10;
            this.computeMaterial.uniforms.uFeedRate.value += (Math.min(0.0375, 0.031 + this.pointerPosition.y / 1000) - this.computeMaterial.uniforms.uFeedRate.value) / 10;
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

    #initCubeReactionDiffusion() {
        this.computeMaterial = new ShaderMaterial({
            uniforms: {
                uResolution: { value: new Vector2(this.computeSize, this.computeSize) },
                uCubeMap: { value: new CubeTexture() },
                uPointer: { value: new Vector2() },
                uTime: { value: 0 },
                uDiffusionA: { value: 1 },
                uDiffusionB: { value: 0.45 },
                uFeedRate: { value: 0.0375 },
                uKillRate: { value: 0.0575 },
                uFlowSpeed: { value: 0.0003 }
            },
            vertexShader: reactionDiffusionVertexShader,
            fragmentShader: reactionDiffusionFragmentShader,
            side: BackSide
        });

        // make a sphere geometry from a box by moving each
        // vertex to the length of the radius
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

        // init the mesh and render targets
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