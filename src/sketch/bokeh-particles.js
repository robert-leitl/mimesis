import { AdditiveBlending, BufferAttribute, BufferGeometry, Mesh, Points, ShaderMaterial, TextureLoader, Vector3 } from 'three';
import particleFragmentShader from '../shader/bokeh-particle-fragment.glsl';
import particleVertexShader from '../shader/bokeh-particle-vertex.glsl';

export class BokehParticles {

    #NUM_PARTICLES = 50;

    constructor(scene) {
        this.scene = scene;

        const assets = [
            new TextureLoader().loadAsync(new URL('../assets/bokeh.png', import.meta.url))
        ];

        Promise.all(assets).then((res) => {
            this.particleTexture = res[0];
            this.#init();
        });
    }

    update(time) {
        if(this.particleMaterial) {
            this.particleMaterial.uniforms.uTime.value = time;
        }
    }

    #init() {
        const geometry = new BufferGeometry();
        const vertices = new Float32Array(this.#NUM_PARTICLES * 3);
        const radius = 1.2;
        const beltWidth = 1.;

        for (let i = 0; i < this.#NUM_PARTICLES; i++) {
            const index = i * 3;
            const pos = new Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5);
            const elevation = (Math.random() * beltWidth - beltWidth / 2) + radius;
            pos.normalize().multiplyScalar(elevation);
            vertices[index + 0] = pos.x;
            vertices[index + 1] = pos.y;
            vertices[index + 2] = pos.z;
        }

        geometry.setAttribute('position', new BufferAttribute(vertices, 3));

        this.particleMaterial = new ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uTexture: { value: this.particleTexture }
            },
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            alphaTest: true,
            blending: AdditiveBlending
        });

        const mesh = new Points(geometry, this.particleMaterial);
        this.scene.add(mesh);
    }

}