import * as THREE from 'three';
import { Integrator } from './Integrator';
import { StateVector, StateDerivative, IntegratorConfig } from '../../types';

/**
 * Intégrateur d'Euler - Méthode du premier ordre
 * Simple mais peu précise, principalement pour tests
 */
export class EulerIntegrator extends Integrator {
    constructor(config: Partial<IntegratorConfig> = {}) {
        super({ ...config, method: 'euler' });
    }

    /**
     * Pas d'intégration d'Euler: y_{n+1} = y_n + h * f(t_n, y_n)
     */
    public step(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): StateVector {
        // Calculer la dérivée au point actuel
        const k1 = derivative(state, state.time);

        // Appliquer le pas d'Euler
        const newState: StateVector = {
            position: state.position.clone().add(k1.position.clone().multiplyScalar(deltaTime)),
            velocity: state.velocity.clone().add(k1.velocity.clone().multiplyScalar(deltaTime)),
            time: state.time + deltaTime
        };

        return newState;
    }

    /**
     * Pas adaptatif pour Euler (comparaison avec demi-pas)
     */
    protected override adaptiveStep(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): { state: StateVector; nextStep: number; error: number } {
        // Un pas complet
        const fullStep = this.step(state, derivative, deltaTime);

        // Deux demi-pas
        const halfStep1 = this.step(state, derivative, deltaTime / 2);
        const halfStep2 = this.step(halfStep1, derivative, deltaTime / 2);

        // Estimer l'erreur
        const error = this.calculateError(fullStep, halfStep2);

        // Ajuster le pas de temps
        let nextStep = deltaTime;
        if (error > this.config.errorTolerance!) {
            nextStep = deltaTime * 0.8 * Math.pow(this.config.errorTolerance! / error, 0.5);
        } else if (error < this.config.errorTolerance! / 10) {
            nextStep = deltaTime * 1.2;
        }

        // Contraindre le pas
        nextStep = Math.max(this.config.minStep!, Math.min(nextStep, this.config.maxStep!));

        return {
            state: halfStep2, // Utiliser la solution plus précise
            nextStep,
            error
        };
    }
}