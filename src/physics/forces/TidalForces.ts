import * as THREE from 'three';
import { Force } from './Force';

/**
 * Forces de marée dues aux gradients gravitationnels
 */
export class TidalForces extends Force {
    private primaryBodyMu: number;
    private primaryBodyPosition: THREE.Vector3;

    constructor(primaryBodyMu: number, primaryBodyPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        super('Tidal Forces');
        this.primaryBodyMu = primaryBodyMu;
        this.primaryBodyPosition = primaryBodyPosition;
    }

    /**
     * Calcule l'accélération due aux forces de marée
     */
    public calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        mass: number,
        time: number
    ): THREE.Vector3 {
        // Vecteur du centre de masse vers la position
        const relativePos = position.clone().sub(this.primaryBodyPosition);
        const r = relativePos.length();

        if (r === 0) {
            return new THREE.Vector3(0, 0, 0);
        }

        // Force de marée = -μ * [3(r·ẑ)ẑ/r⁵ - r/r³]
        // où ẑ est la direction vers le corps perturbateur

        // Pour simplifier, on calcule l'effet de marée du corps central
        const r3 = r * r * r;
        const r5 = r3 * r * r;

        // Gradient gravitationnel (approximation linéaire)
        const tidalAcceleration = new THREE.Vector3(
            -2 * this.primaryBodyMu * relativePos.x / r5,
            -2 * this.primaryBodyMu * relativePos.y / r5,
            4 * this.primaryBodyMu * relativePos.z / r5
        );

        return tidalAcceleration;
    }

    /**
     * Vérifie si les forces de marée sont significatives
     */
    public override isApplicable(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        time: number
    ): boolean {
        if (!this.enabled) return false;

        // Les forces de marée sont importantes pour les objets étendus
        // ou très proches du corps principal
        const distance = position.distanceTo(this.primaryBodyPosition);
        const roche_limit = 2.44 * Math.pow(this.primaryBodyMu / (4 * Math.PI * 2000), 1/3); // Approximation

        return distance < roche_limit * 3; // Significatif jusqu'à 3x la limite de Roche
    }

    /**
     * Met à jour la position du corps principal
     */
    public updatePrimaryBodyPosition(position: THREE.Vector3): void {
        this.primaryBodyPosition = position.clone();
    }
}