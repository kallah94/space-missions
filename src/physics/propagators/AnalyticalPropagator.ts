import * as THREE from 'three';
import { OrbitalPropagator } from './OrbitalPropagator';
import { StateVector } from '../../types';

/**
 * Propagateur analytique pour solutions spécialisées
 */
export class AnalyticalPropagator extends OrbitalPropagator {
    private perturbationType: 'none' | 'j2' | 'atmospheric' = 'none';

    /**
     * Configure le type de perturbation analytique
     */
    setPerturbationType(type: 'none' | 'j2' | 'atmospheric'): void {
        this.perturbationType = type;
    }

    /**
     * Propage analytiquement avec perturbations
     */
    propagate(
        initialState: StateVector,
        timeStep: number,
        duration: number
    ): StateVector[] {
        const states: StateVector[] = [];
        const elements = this.stateVectorToElements(initialState);

        for (let t = 0; t <= duration; t += timeStep) {
            const propagatedElements = this.propagateElements(elements, t);
            const state = this.elementsToStateVector(propagatedElements);

            states.push({
                ...state,
                time: t
            });
        }

        return states;
    }

    /**
     * Propage un pas de temps
     */
    propagateStep(state: StateVector, deltaTime: number): StateVector {
        const elements = this.stateVectorToElements(state);
        const propagatedElements = this.propagateElements(elements, deltaTime);
        const newState = this.elementsToStateVector(propagatedElements);

        return {
            ...newState,
            time: state.time + deltaTime
        };
    }

    /**
     * Calcule l'accélération (utilisé pour validation)
     */
     calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        time: number
    ): THREE.Vector3 {
        const r = position.length();
        let acceleration = position.clone().normalize().multiplyScalar(-this.mu / (r * r));

        // Ajouter perturbations selon le type
        if (this.perturbationType === 'j2') {
            acceleration.add(this.calculateJ2Perturbation(position));
        }

        return acceleration;
    }

    /**
     * Propage les éléments orbitaux analytiquement
     */
    private propagateElements(elements: any, deltaTime: number): any {
        let propagatedElements = { ...elements };

        switch (this.perturbationType) {
            case 'j2':
                propagatedElements = this.propagateWithJ2(elements, deltaTime);
                break;
            case 'atmospheric':
                propagatedElements = this.propagateWithAtmosphere(elements, deltaTime);
                break;
            default:
                // Propagation Képlérienne pure
                const n = Math.sqrt(this.mu / Math.pow(elements.semiMajorAxis, 3));
                const deltaM = n * deltaTime;
                const E0 = this.trueToEccentricAnomaly(elements.trueAnomaly, elements.eccentricity);
                const M0 = E0 - elements.eccentricity * Math.sin(E0);
                const M = M0 + deltaM;
                const E = this.solveKeplerEquation(M, elements.eccentricity);
                const nu = this.eccentricToTrueAnomaly(E, elements.eccentricity);

                propagatedElements.trueAnomaly = nu;
                break;
        }

        return propagatedElements;
    }

    /**
     * Propagation avec perturbation J2
     */
    private propagateWithJ2(elements: any, deltaTime: number): any {
        const { semiMajorAxis: a, eccentricity: e, inclination: i } = elements;
        const n = Math.sqrt(this.mu / (a * a * a));
        const J2 = 1.08262668e-3;
        const Re = 6378.137; // km

        // Taux de précession dus à J2
        const factor = -1.5 * J2 * (Re / a) ** 2 * n;
        const cosI = Math.cos(i);

        const omegaDot = factor * cosI / ((1 - e * e) ** 2);
        const wDot = factor * (2 - 2.5 * Math.sin(i) ** 2) / ((1 - e * e) ** 2);

        // Mise à jour des éléments
        const propagatedElements = { ...elements };
        propagatedElements.longitudeOfAscendingNode += omegaDot * deltaTime;
        propagatedElements.argumentOfPeriapsis += wDot * deltaTime;

        // Propagation de l'anomalie moyenne
        const nMean = n + factor * Math.sqrt(1 - e * e) * (1 - 1.5 * Math.sin(i) ** 2);
        const deltaM = nMean * deltaTime;
        const E0 = this.trueToEccentricAnomaly(elements.trueAnomaly, e);
        const M0 = E0 - e * Math.sin(E0);
        const M = M0 + deltaM;
        const E = this.solveKeplerEquation(M, e);
        const nu = this.eccentricToTrueAnomaly(E, e);

        propagatedElements.trueAnomaly = nu;

        return propagatedElements;
    }

    /**
     * Propagation avec traînée atmosphérique
     */
    private propagateWithAtmosphere(elements: any, deltaTime: number): any {
        // Implémentation simplifiée de la décroissance orbitale
        const { semiMajorAxis: a, eccentricity: e } = elements;

        // Modèle simple de décroissance
        const altitude = a - 6378.137; // km
        if (altitude < 2000) { // Seulement en dessous de 2000 km
            const dragCoeff = this.calculateDragDecay(altitude);
            const newA = a - dragCoeff * deltaTime;

            const propagatedElements = { ...elements };
            propagatedElements.semiMajorAxis = Math.max(newA, 6378.137 + 100); // Minimum 100 km

            return propagatedElements;
        }

        return elements;
    }

    /**
     * Calcule la décroissance due à la traînée
     */
    private calculateDragDecay(altitude: number): number {
        // Modèle très simplifié
        if (altitude > 1000) return 0;
        return 0.001 * Math.exp(-(altitude - 200) / 50); // km/s
    }

    /**
     * Calcule la perturbation J2
     */
    private calculateJ2Perturbation(position: THREE.Vector3): THREE.Vector3 {
        const r = position.length();
        const J2 = 1.08262668e-3;
        const Re = 6378.137;
        const factor = 1.5 * J2 * this.mu * (Re / r) ** 2 / (r ** 3);

        const z2r2 = (position.z / r) ** 2;

        return new THREE.Vector3(
            factor * position.x * (5 * z2r2 - 1),
            factor * position.y * (5 * z2r2 - 1),
            factor * position.z * (5 * z2r2 - 3)
        );
    }

    // Méthodes utilitaires
    private trueToEccentricAnomaly(nu: number, e: number): number {
        return Math.atan2(
            Math.sqrt(1 - e * e) * Math.sin(nu),
            e + Math.cos(nu)
        );
    }

    private eccentricToTrueAnomaly(E: number, e: number): number {
        return Math.atan2(
            Math.sqrt(1 - e * e) * Math.sin(E),
            Math.cos(E) - e
        );
    }

    private solveKeplerEquation(M: number, e: number): number {
        let E = M;
        for (let i = 0; i < 10; i++) {
            const deltaE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
            E -= deltaE;
            if (Math.abs(deltaE) < 1e-12) break;
        }
        return E;
    }
}