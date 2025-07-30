import * as THREE from 'three';
import { Force } from './Force';
import { GravitationalForceConfig } from '../../types';

/**
 * Force gravitationnelle principale et corps tiers
 */
export class GravitationalForce extends Force {
    private config: GravitationalForceConfig;

    constructor(config: GravitationalForceConfig) {
        super('Gravitational');
        this.config = config;
    }

    /**
     * Calcule l'accélération gravitationnelle totale
     */
    public calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        mass: number,
        time: number
    ): THREE.Vector3 {
        // Force gravitationnelle du corps central
        const r = position.length();
        const centralAcceleration = position.clone()
            .normalize()
            .multiplyScalar(-this.config.centralBodyMu / (r * r));

        // Ajouter les perturbations des corps tiers
        let totalAcceleration = centralAcceleration;

        if (this.config.thirdBodies) {
            for (const body of this.config.thirdBodies) {
                const thirdBodyAccel = this.calculateThirdBodyAcceleration(
                    position, body.mu, body.ephemeris(time)
                );
                totalAcceleration.add(thirdBodyAccel);
            }
        }

        return totalAcceleration;
    }

    /**
     * Calcule l'accélération due à un corps tiers
     */
    private calculateThirdBodyAcceleration(
        satellitePosition: THREE.Vector3,
        thirdBodyMu: number,
        thirdBodyPosition: THREE.Vector3
    ): THREE.Vector3 {
        // Vecteur du satellite vers le corps tiers
        const r_sat_body = thirdBodyPosition.clone().sub(satellitePosition);
        const r_sat_body_mag = r_sat_body.length();

        // Vecteur de l'origine vers le corps tiers
        const r_body_mag = thirdBodyPosition.length();

        // Accélération directe du corps tiers sur le satellite
        const directAccel = r_sat_body.clone()
            .normalize()
            .multiplyScalar(thirdBodyMu / (r_sat_body_mag * r_sat_body_mag));

        // Accélération indirecte (effet sur le corps central)
        const indirectAccel = thirdBodyPosition.clone()
            .normalize()
            .multiplyScalar(-thirdBodyMu / (r_body_mag * r_body_mag));

        return directAccel.add(indirectAccel);
    }

    /**
     * Met à jour le paramètre gravitationnel du corps central
     */
    public setCentralBodyMu(mu: number): void {
        this.config.centralBodyMu = mu;
    }

    /**
     * Ajoute un corps tiers
     */
    public addThirdBody(
        name: string,
        mu: number,
        ephemeris: (time: number) => THREE.Vector3
    ): void {
        if (!this.config.thirdBodies) {
            this.config.thirdBodies = [];
        }
        this.config.thirdBodies.push({ name, mu, ephemeris });
    }
}
