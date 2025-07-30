import * as THREE from 'three';
import { Force } from './Force';
import { ThrustProfile } from '../../types';

/**
 * Force de propulsion (moteurs)
 */
export class ThrustForce extends Force {
    private thrustProfiles: ThrustProfile[] = [];
    private currentProfileIndex: number = 0;

    constructor() {
        super('Thrust');
    }

    /**
     * Ajoute un profil de poussée
     */
    public addThrustProfile(profile: ThrustProfile): void {
        this.thrustProfiles.push(profile);
    }

    /**
     * Calcule l'accélération due à la poussée
     */
    public calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        mass: number,
        time: number
    ): THREE.Vector3 {
        // Trouver le profil de poussée actif
        const activeProfile = this.getActiveProfile(time);

        if (!activeProfile) {
            return new THREE.Vector3(0, 0, 0);
        }

        // Accélération = Force / masse
        return activeProfile.direction.clone().multiplyScalar(activeProfile.magnitude / mass);
    }

    /**
     * Trouve le profil de poussée actif à un instant donné
     */
    private getActiveProfile(time: number): ThrustProfile | null {
        // Ici on pourrait implémenter une logique plus complexe
        // Pour l'instant, on retourne le premier profil si disponible
        return this.thrustProfiles.length > 0 ? this.thrustProfiles[0] : null;
    }

    /**
     * Calcule la consommation de carburant
     */
    public calculateFuelConsumption(
        thrustMagnitude: number,
        duration: number,
        specificImpulse: number
    ): number {
        const g0 = 9.80665; // m/s², accélération gravitationnelle standard
        return (thrustMagnitude * duration) / (specificImpulse * g0);
    }

    /**
     * Vérifie si la poussée est active
     */
    public override isApplicable(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        time: number
    ): boolean {
        return this.enabled && this.thrustProfiles.length > 0;
    }

    /**
     * Nettoie les profils de poussée expirés
     */
    public cleanExpiredProfiles(currentTime: number): void {
        this.thrustProfiles = this.thrustProfiles.filter(
            profile => currentTime < profile.duration
        );
    }
}