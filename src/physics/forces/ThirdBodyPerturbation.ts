import * as THREE from 'three';
import { Force } from './Force';

/**
 * Perturbations gravitationnelles des corps tiers (Lune, Soleil)
 */
export class ThirdBodyPerturbation extends Force {
    private thirdBodyMu: number;
    private thirdBodyEphemeris: (time: number) => THREE.Vector3;

    constructor(
        name: string,
        mu: number,
        ephemeris: (time: number) => THREE.Vector3
    ) {
        super(`Third Body: ${name}`);
        this.thirdBodyMu = mu;
        this.thirdBodyEphemeris = ephemeris;
    }

    /**
     * Calcule l'accélération due au corps tiers
     */
    public calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        mass: number,
        time: number
    ): THREE.Vector3 {
        const thirdBodyPos = this.thirdBodyEphemeris(time);

        // Vecteur du satellite vers le corps tiers
        const r_sat_body = thirdBodyPos.clone().sub(position);
        const r_sat_body_mag = r_sat_body.length();

        // Vecteur de l'origine vers le corps tiers
        const r_body_mag = thirdBodyPos.length();

        // Accélération directe
        const directAccel = r_sat_body.clone()
            .normalize()
            .multiplyScalar(this.thirdBodyMu / (r_sat_body_mag ** 2));

        // Accélération indirecte (effet sur le corps central)
        const indirectAccel = thirdBodyPos.clone()
            .normalize()
            .multiplyScalar(-this.thirdBodyMu / (r_body_mag ** 2));

        return directAccel.add(indirectAccel);
    }

    /**
     * Vérifie si la perturbation est significative
     */
    public override isApplicable(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        time: number
    ): boolean {
        if (!this.enabled) return false;

        // La perturbation lunaire/solaire est toujours présente mais plus
        // significative pour les orbites hautes
        const altitude = position.length() - 6378.137; // Rayon terrestre
        return altitude > 1000; // Au-dessus de 1000 km
    }

    /**
     * Crée une éphéméride lunaire simplifiée
     */
    public static createLunarEphemeris(): (time: number) => THREE.Vector3 {
        return (time: number) => {
            // Orbite lunaire simplifiée (circulaire)
            const moonPeriod = 27.32166 * 24 * 3600; // période en secondes
            const moonDistance = 384400; // km
            const angle = (2 * Math.PI * time) / moonPeriod;

            return new THREE.Vector3(
                moonDistance * Math.cos(angle),
                moonDistance * Math.sin(angle),
                0
            );
        };
    }

    /**
     * Crée une éphéméride solaire simplifiée
     */
    public static createSolarEphemeris(): (time: number) => THREE.Vector3 {
        return (time: number) => {
            // Position du Soleil par rapport à la Terre (simplifiée)
            const earthPeriod = 365.25 * 24 * 3600; // période en secondes
            const earthDistance = 149597870.7; // km (1 AU)
            const angle = (2 * Math.PI * time) / earthPeriod;

            return new THREE.Vector3(
                earthDistance * Math.cos(angle),
                earthDistance * Math.sin(angle),
                0
            );
        };
    }
}
