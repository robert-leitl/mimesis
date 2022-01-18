import { AdditiveBlending, Color, Line } from 'three';
import { LineDashedMaterial } from 'three';
import { BufferGeometry, CatmullRomCurve3, LineBasicMaterial, ShaderMaterial, Vector3 } from 'three';
import lineFragmentShader from '../shader/line-fragment.glsl';
import lineVertexShader from '../shader/line-vertex.glsl';

export class LineParticles {

    #NUM_PARTICLES = 200;

    constructor(scene) {
        this.scene = scene;
        this.#initLineParticles();
    }

    update(time) {
        if(this.lineParticleMaterial) {
            this.lineParticleMaterial.uniforms.uDashOffset.value = time / 10;
        }
    }

    #initLineParticles() {
        const geometry = new BufferGeometry();
        const vertices = [];
        const radius = 0.45;
        const angleIncrement = 0.55;
        let theta = 0;
        let phi = 0;
        let r = 0;

        for (let i = 0; i < this.#NUM_PARTICLES; i++) {
            theta += angleIncrement;
            phi += (Math.random()) * angleIncrement;
            r = radius + ((Math.random() * 2 - 1) * 0.1);
            vertices.push(
                new Vector3(
                    r * Math.sin(phi) * Math.sin(theta),
                    r * Math.cos(theta),
                    r * Math.cos(phi) * Math.sin(theta)
                )
            );
        }

        const curve = new CatmullRomCurve3(vertices);
        const points = curve.getPoints(800);
        geometry.setFromPoints(points);

        this.lineMaterial = new LineDashedMaterial({ 
            color: 0xffffff,
            opacity: 0.2,
            transparent: true,
            alphaTest: true,
            blending: AdditiveBlending,
            linewidth: 3,
            scale: 5,
            dashSize: .05,
            gapSize: 2
        });

        this.lineParticleMaterial = new ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uDashOffset: { value: 0 }
            },
            vertexShader: lineVertexShader,
            fragmentShader: lineFragmentShader,
            transparent: true,
            depthTest: true,
            depthWrite: true,
            alphaTest: true,
            blending: AdditiveBlending
        });
        

        const mesh = new Line(geometry, this.lineParticleMaterial);
        mesh.computeLineDistances();
        this.scene.add(mesh);
    }

}