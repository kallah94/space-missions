import * as THREE from 'three';
import { StateVector, StateDerivative, IntegratorConfig, IntegrationResult } from '../../types';

/**
 * Classe abstraite de base pour tous les intégrateurs numériques
 */
export abstract class Integrator {
    protected config: IntegratorConfig;
    protected stepCount: number = 0;
    protected totalError: number = 0;

    constructor(config: Partial<IntegratorConfig> = {}) {
        this.config = {
            method: 'rk4',
            adaptiveStep: false,
            minStep: 1e-6,
            maxStep: 3600,
            errorTolerance: 1e-12,
            ...config
        };
    }

    /**
     * Intègre un système d'équations différentielles
     */
    public integrate(
        initialState: StateVector,
        derivative: StateDerivative,
        timeStep: number,
        totalTime: number
    ): StateVector[] {
        const states: StateVector[] = [];
        const stepSizes: number[] = [];
        const errors: number[] = [];

        let currentState = { ...initialState };
        let currentTime = 0;
        let dt = timeStep;

        const startTime = performance.now();
        this.stepCount = 0;
        this.totalError = 0;

        states.push({ ...currentState });

        while (currentTime < totalTime) {
            // Ajuster le pas de temps pour ne pas dépasser la fin
            if (currentTime + dt > totalTime) {
                dt = totalTime - currentTime;
            }

            // Intégration d'un pas
            const stepResult = this.step(currentState, derivative, dt);

            if (this.config.adaptiveStep) {
                const adaptiveResult = this.adaptiveStep(currentState, derivative, dt);
                currentState = adaptiveResult.state;
                dt = adaptiveResult.nextStep;
                this.totalError += adaptiveResult.error;
                errors.push(adaptiveResult.error);
            } else {
                currentState = stepResult;
                errors.push(0);
            }

            currentTime += dt;
            currentState.time = currentTime;

            states.push({ ...currentState });
            stepSizes.push(dt);
            this.stepCount++;

            // Contraintes sur le pas de temps
            dt = Math.max(this.config.minStep!, Math.min(dt, this.config.maxStep!));
        }

        const executionTime = performance.now() - startTime;

        return states;
    }

    /**
     * Intègre un seul pas de temps
     */
    public abstract step(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): StateVector;

    /**
     * Pas adaptatif avec contrôle d'erreur
     */
    protected adaptiveStep(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): { state: StateVector; nextStep: number; error: number } {
        // Implémentation par défaut - à redéfinir dans les classes dérivées
        const newState = this.step(state, derivative, deltaTime);
        return {
            state: newState,
            nextStep: deltaTime,
            error: 0
        };
    }

    /**
     * Calcule l'erreur entre deux états
     */
    protected calculateError(state1: StateVector, state2: StateVector): number {
        const positionError = state1.position.distanceTo(state2.position);
        const velocityError = state1.velocity.distanceTo(state2.velocity);

        // Erreur relative combinée
        const positionMagnitude = state1.position.length();
        const velocityMagnitude = state1.velocity.length();

        const relativePositionError = positionError / Math.max(positionMagnitude, 1);
        const relativeVelocityError = velocityError / Math.max(velocityMagnitude, 1);

        return Math.max(relativePositionError, relativeVelocityError);
    }

    /**
     * Obtient les statistiques d'intégration
     */
    public getStatistics(): { stepCount: number; totalError: number } {
        return {
            stepCount: this.stepCount,
            totalError: this.totalError
        };
    }

    /**
     * Clone un vecteur d'état
     */
    protected cloneState(state: StateVector): StateVector {
        return {
            position: state.position.clone(),
            velocity: state.velocity.clone(),
            time: state.time
        };
    }

    /**
     * Addition de vecteurs d'état (pour combinaisons linéaires)
     */
    protected addStates(state1: StateVector, state2: StateVector, scale2: number = 1): StateVector {
        return {
            position: state1.position.clone().add(state2.position.clone().multiplyScalar(scale2)),
            velocity: state1.velocity.clone().add(state2.velocity.clone().multiplyScalar(scale2)),
            time: state1.time
        };
    }

    /**
     * Multiplication scalaire d'un vecteur d'état
     */
    protected scaleState(state: StateVector, scale: number): StateVector {
        return {
            position: state.position.clone().multiplyScalar(scale),
            velocity: state.velocity.clone().multiplyScalar(scale),
            time: state.time
        };
    }
}