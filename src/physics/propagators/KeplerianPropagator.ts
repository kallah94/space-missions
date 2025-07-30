import * as THREE from 'three';
import { OrbitalPropagator } from './OrbitalPropagator';
import { StateVector, OrbitalElements } from '../../types';

/**
 * Propagateur Képlérien pour problème à deux corps
 */
export class KeplerianPropagator extends OrbitalPropagator {
    /**
     * Propage un état orbital en utilisant la solution analytique Képlérienne
     */
    propagate(
        initialState: StateVector,
        timeStep: number,
        duration: number
    ): StateVector[] {
        const states: StateVector[] = [];
        let currentState = initialState;

        for (let t = 0; t <= duration; t += timeStep) {
            states.push({
                ...currentState,
                time: t
            });

            if (t < duration) {
                currentState = this.propagateStep(currentState, timeStep);
            }
        }

        return states;
    }

    /**
     * Propage un pas de temps en utilisant l'équation de Kepler
     */
    propagateStep(state: StateVector, deltaTime: number): StateVector {
        // Convertir vers éléments orbitaux
        const elements = this.stateVectorToElements(state);

        // Calculer le mouvement moyen
        const n = Math.sqrt(this.mu / Math.pow(elements.semiMajorAxis, 3));

        // Calculer l'anomalie moyenne initiale
        const E0 = this.trueToEccentricAnomaly(elements.trueAnomaly, elements.eccentricity);
        const M0 = E0 - elements.eccentricity * Math.sin(E0);

        // Nouvelle anomalie moyenne
        const M = M0 + n * deltaTime;

        // Résoudre l'équation de Kepler pour la nouvelle anomalie excentrique
        const E = this.solveKeplerEquation(M, elements.eccentricity);

        // Convertir vers anomalie vraie
        const nu = this.eccentricToTrueAnomaly(E, elements.eccentricity);

        // Mettre à jour les éléments orbitaux
        const newElements: OrbitalElements = {
            ...elements,
            trueAnomaly: nu
        };

        // Convertir vers vecteur d'état
        const newState = this.elementsToStateVector(newElements);

        return {
            ...newState,
            time: state.time + deltaTime
        };
    }

    /**
     * Calcule l'accélération gravitationnelle simple
     */
    calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        time: number
    ): THREE.Vector3 {
        const r = position.length();
        return position.clone().normalize().multiplyScalar(-this.mu / (r * r));
    }

    /**
     * Résout l'équation de Kepler M = E - e*sin(E)
     */
    private solveKeplerEquation(M: number, e: number, tolerance: number = 1e-12): number {
        let E = M; // Estimation initiale
        let deltaE = 1;
        let iterations = 0;
        const maxIterations = 50;

        while (Math.abs(deltaE) > tolerance && iterations < maxIterations) {
            const f = E - e * Math.sin(E) - M;
            const fp = 1 - e * Math.cos(E);
            deltaE = f / fp;
            E -= deltaE;
            iterations++;
        }

        return E;
    }

    /**
     * Convertit anomalie vraie vers anomalie excentrique
     */
    private trueToEccentricAnomaly(nu: number, e: number): number {
        return Math.atan2(
            Math.sqrt(1 - e * e) * Math.sin(nu),
            e + Math.cos(nu)
        );
    }

    /**
     * Convertit anomalie excentrique vers anomalie vraie
     */
    private eccentricToTrueAnomaly(E: number, e: number): number {
        return Math.atan2(
            Math.sqrt(1 - e * e) * Math.sin(E),
            Math.cos(E) - e
        );
    }
}