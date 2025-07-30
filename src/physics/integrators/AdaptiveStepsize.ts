import * as THREE from 'three';
import { Integrator } from './Integrator';
import { RungeKutta4 } from './RungeKutta4';
import { StateVector, StateDerivative, IntegratorConfig } from '../../types';

/**
 * Wrapper pour pas de temps adaptatif avec différents intégrateurs
 */
export class AdaptiveStepsize extends Integrator {
    private baseIntegrator: Integrator;
    private minStepReductions: number = 0;
    private maxStepIncrements: number = 0;

    constructor(
        baseIntegrator?: Integrator,
        config: Partial<IntegratorConfig> = {}
    ) {
        super({ ...config, adaptiveStep: true });
        this.baseIntegrator = baseIntegrator || new RungeKutta4();
    }

    /**
     * Utilise l'intégrateur de base
     */
    public step(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): StateVector {
        return this.baseIntegrator.step(state, derivative, deltaTime);
    }

    /**
     * Contrôle adaptatif avancé du pas de temps
     */
    protected override adaptiveStep(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): { state: StateVector; nextStep: number; error: number } {
        let dt = deltaTime;
        let iterations = 0;
        const maxIterations = 10;

        while (iterations < maxIterations) {
            // Essayer le pas proposé
            const result = this.tryStep(state, derivative, dt);

            if (result.error <= this.config.errorTolerance!) {
                // Pas accepté
                let nextStep = this.calculateNextStep(dt, result.error);

                // Limiter les changements brusques
                const changeRatio = nextStep / dt;
                if (changeRatio > 2.0) {
                    nextStep = dt * 2.0;
                    this.maxStepIncrements++;
                } else if (changeRatio < 0.5) {
                    nextStep = dt * 0.5;
                    this.minStepReductions++;
                }

                return {
                    state: result.state,
                    nextStep: Math.max(this.config.minStep!, Math.min(nextStep, this.config.maxStep!)),
                    error: result.error
                };
            }

            // Réduire le pas et réessayer
            dt *= 0.5;
            iterations++;
            this.minStepReductions++;

            if (dt < this.config.minStep!) {
                console.warn('Pas de temps minimum atteint, précision compromise');
                break;
            }
        }

        // Si on n'arrive pas à converger, utiliser le pas minimum
        const fallbackResult = this.tryStep(state, derivative, this.config.minStep!);
        return {
            state: fallbackResult.state,
            nextStep: this.config.minStep!,
            error: fallbackResult.error
        };
    }

    /**
     * Essaie un pas avec estimation d'erreur
     */
    private tryStep(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): { state: StateVector; error: number } {
        // Méthode de Richardson pour estimation d'erreur
        const fullStep = this.baseIntegrator.step(state, derivative, deltaTime);
        const halfStep1 = this.baseIntegrator.step(state, derivative, deltaTime / 2);
        const halfStep2 = this.baseIntegrator.step(halfStep1, derivative, deltaTime / 2);

        const error = this.calculateError(fullStep, halfStep2);

        return {
            state: halfStep2, // Plus précis
            error
        };
    }

    /**
     * Calcule le prochain pas de temps optimal
     */
    private calculateNextStep(currentStep: number, error: number): number {
        const safetyFactor = 0.9;
        const tolerance = this.config.errorTolerance!;

        if (error === 0) {
            return currentStep * 2; // Doubler si erreur nulle
        }

        // Formule classique pour le contrôle adaptatif
        const optimalStep = currentStep * safetyFactor * Math.pow(tolerance / error, 0.2);

        // Limiter les variations extrêmes
        return Math.max(0.1 * currentStep, Math.min(5 * currentStep, optimalStep));
    }

    /**
     * Statistiques du contrôle adaptatif
     */
    public getAdaptiveStatistics(): {
        stepReductions: number;
        stepIncrements: number;
        efficiency: number;
    } {
        const total = this.minStepReductions + this.maxStepIncrements;
        return {
            stepReductions: this.minStepReductions,
            stepIncrements: this.maxStepIncrements,
            efficiency: total > 0 ? this.stepCount / (this.stepCount + total) : 1
        };
    }
}
