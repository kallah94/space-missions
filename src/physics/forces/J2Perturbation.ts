import * as THREE from 'three';
import { Force } from './Force';
import { HarmonicPerturbationConfig } from '../../types';

/**
 * Perturbation gravitationnelle J2 (aplatissement terrestre)
 */
export class J2Perturbation extends Force {
    private config: HarmonicPerturbationConfig;
    private mu: number;

    constructor(config: HarmonicPerturbationConfig, mu: number = 398600.4418) {
        super('J2 Perturbation');
        this.config = config;
        this.mu = mu;
    }

    /**
     * Calcule l'accélération due à J2
     */
    public calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        mass: number,
        time: number
    ): THREE.Vector3 {
        if (!this.config.j2) return new THREE.Vector3(0, 0, 0);

        const r = position.length();
        const Re = this.config.planetRadius;
        const J2 = this.config.j2;

        // Facteur commun
        const factor = 1.5 * J2 * this.mu * (Re / r) ** 2 / (r ** 3);

        // Coordonnées normalisées
        const x = position.x / r;
        const y = position.y / r;
        const z = position.z / r;
        const z2 = z * z;

        // Accélération J2
        const ax = factor * x * (5 * z2 - 1);
        const ay = factor * y * (5 * z2 - 1);
        const az = factor * z * (5 * z2 - 3);

        return new THREE.Vector3(ax, ay, az);
    }

    /**
     * Vérifie si J2 est significatif à cette altitude
     */
    public override isApplicable(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        time: number
    ): boolean {
        if (!this.enabled || !this.config.j2) return false;

        const altitude = position.length() - this.config.planetRadius;
        // J2 devient négligeable au-delà de ~100,000 km pour la Terre
        return altitude < 100000;
    }

    /**
     * Calcule les taux de précession dus à J2
     */
    public calculatePrecessionRates(
        semiMajorAxis: number,
        eccentricity: number,
        inclination: number
    ): { omegaDot: number; wDot: number; mDot: number } {
        if (!this.config.j2) {
            return { omegaDot: 0, wDot: 0, mDot: 0 };
        }

        const n = Math.sqrt(this.mu / (semiMajorAxis ** 3));
        const factor = -1.5 * this.config.j2 * (this.config.planetRadius / semiMajorAxis) ** 2 * n;
        const cosI = Math.cos(inclination);
        const sinI2 = Math.sin(inclination) ** 2;
        const eta = Math.sqrt(1 - eccentricity ** 2);

        // Précession du nœud ascendant
        const omegaDot = factor * cosI / (eta ** 4);

        // Précession du périgée
        const wDot = factor * (2 - 2.5 * sinI2) / (eta ** 4);

        // Dérive de l'anomalie moyenne
        const mDot = factor * eta * (1 - 1.5 * sinI2) / (eta ** 4);

        return { omegaDot, wDot, mDot };
    }
}