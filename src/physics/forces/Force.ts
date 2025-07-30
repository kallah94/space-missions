import * as THREE from 'three';
import { StateVector } from '../../types';

/**
 * Interface de base pour toutes les forces agissant sur les objets spatiaux
 */
export abstract class Force {
    public readonly name: string;
    public enabled: boolean = true;

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Calcule l'accélération due à cette force
     */
    public abstract calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        mass: number,
        time: number
    ): THREE.Vector3;

    /**
     * Vérifie si la force est applicable à cette position/vitesse
     */
    public isApplicable(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        time: number
    ): boolean {
        return this.enabled;
    }

    /**
     * Active ou désactive la force
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Obtient l'ordre de grandeur de la force (pour optimisation)
     */
    public getMagnitudeOrder(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        mass: number
    ): number {
        const acceleration = this.calculateAcceleration(position, velocity, mass, 0);
        return acceleration.length();
    }
}
