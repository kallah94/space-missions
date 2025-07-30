import * as THREE from 'three';
import { Force } from './Force';
import { HarmonicPerturbationConfig } from '../../types';

/**
 * Perturbations gravitationnelles J3 et J4
 */
export class J3J4Perturbation extends Force {
    private config: HarmonicPerturbationConfig;
    private mu: number;

    constructor(config: HarmonicPerturbationConfig, mu: number = 398600.4418) {
        super('J3J4 Perturbation');
        this.config = config;
        this.mu = mu;
    }

    /**
     * Calcule l'accélération due à J3 et J4
     */
    public calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        mass: number,
        time: number
    ): THREE.Vector3 {
        let acceleration = new THREE.Vector3(0, 0, 0);

        if (this.config.j3) {
            acceleration.add(this.calculateJ3Acceleration(position));
        }

        if (this.config.j4) {
            acceleration.add(this.calculateJ4Acceleration(position));
        }

        return acceleration;
    }

    /**
     * Calcule l'accélération J3
     */
    private calculateJ3Acceleration(position: THREE.Vector3): THREE.Vector3 {
        if (!this.config.j3) return new THREE.Vector3(0, 0, 0);

        const r = position.length();
        const Re = this.config.planetRadius;
        const J3 = this.config.j3;

        const factor = -2.5 * J3 * this.mu * (Re / r) ** 3 / (r ** 3);

        const x = position.x / r;
        const y = position.y / r;
        const z = position.z / r;
        const z2 = z * z;

        const ax = factor * x * z * (7 * z2 - 3);
        const ay = factor * y * z * (7 * z2 - 3);
        const az = factor * (35 * z2 * z2 - 30 * z2 + 3) / 5;

        return new THREE.Vector3(ax, ay, az);
    }

    /**
     * Calcule l'accélération J4
     */
    private calculateJ4Acceleration(position: THREE.Vector3): THREE.Vector3 {
        if (!this.config.j4) return new THREE.Vector3(0, 0, 0);

        const r = position.length();
        const Re = this.config.planetRadius;
        const J4 = this.config.j4;

        const factor = 1.875 * J4 * this.mu * (Re / r) ** 4 / (r ** 3);

        const x = position.x / r;
        const y = position.y / r;
        const z = position.z / r;
        const z2 = z * z;
        const z4 = z2 * z2;

        const ax = factor * x * (35 * z4 - 30 * z2 + 3);
        const ay = factor * y * (35 * z4 - 30 * z2 + 3);
        const az = factor * z * (35 * z4 - 20 * z2 + 1);

        return new THREE.Vector3(ax, ay, az);
    }

    /**
     * Vérifie si les harmoniques supérieures sont significatives
     */
    public override isApplicable(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        time: number
    ): boolean {
        if (!this.enabled) return false;

        const altitude = position.length() - this.config.planetRadius;
        // J3/J4 deviennent négligeables plus rapidement que J2
        return altitude < 50000;
    }
}
