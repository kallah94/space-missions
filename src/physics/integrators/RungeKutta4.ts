import * as THREE from 'three';
import { Integrator } from './Integrator';
import { StateVector, StateDerivative, IntegratorConfig } from '../../types';

/**
 * Intégrateur Runge-Kutta d'ordre 4
 * Excellent compromis précision/performance pour la plupart des applications
 */
export class RungeKutta4 extends Integrator {
    constructor(config: Partial<IntegratorConfig> = {}) {
        super({ ...config, method: 'rk4' });
    }

    /**
     * Pas d'intégration RK4
     */
    public step(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): StateVector {
        const dt = deltaTime;
        const dt_2 = dt / 2;

        // k1 = f(t, y)
        const k1 = derivative(state, state.time);

        // k2 = f(t + dt/2, y + dt/2 * k1)
        const state2 = this.addStates(state, k1, dt_2);
        const k2 = derivative(state2, state.time + dt_2);

        // k3 = f(t + dt/2, y + dt/2 * k2)
        const state3 = this.addStates(state, k2, dt_2);
        const k3 = derivative(state3, state.time + dt_2);

        // k4 = f(t + dt, y + dt * k3)
        const state4 = this.addStates(state, k3, dt);
        const k4 = derivative(state4, state.time + dt);

        // y_{n+1} = y_n + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        const newPosition = state.position.clone()
            .add(k1.position.clone().multiplyScalar(dt / 6))
            .add(k2.position.clone().multiplyScalar(dt / 3))
            .add(k3.position.clone().multiplyScalar(dt / 3))
            .add(k4.position.clone().multiplyScalar(dt / 6));

        const newVelocity = state.velocity.clone()
            .add(k1.velocity.clone().multiplyScalar(dt / 6))
            .add(k2.velocity.clone().multiplyScalar(dt / 3))
            .add(k3.velocity.clone().multiplyScalar(dt / 3))
            .add(k4.velocity.clone().multiplyScalar(dt / 6));

        return {
            position: newPosition,
            velocity: newVelocity,
            time: state.time + dt
        };
    }

    /**
     * Pas adaptatif pour RK4 (embedded RK4-RK5)
     */
    protected override adaptiveStep(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): { state: StateVector; nextStep: number; error: number } {
        // RK4 standard
        const rk4Result = this.step(state, derivative, deltaTime);

        // RK4 avec deux demi-pas pour estimation d'erreur
        const halfStep1 = this.step(state, derivative, deltaTime / 2);
        const halfStep2 = this.step(halfStep1, derivative, deltaTime / 2);

        // Estimer l'erreur (méthode de Richardson)
        const error = this.calculateError(rk4Result, halfStep2) / 15; // Erreur d'ordre 4

        // Contrôle du pas de temps
        let nextStep = deltaTime;
        const safetyFactor = 0.9;

        if (error > this.config.errorTolerance!) {
            // Réduire le pas
            nextStep = deltaTime * safetyFactor * Math.pow(this.config.errorTolerance! / error, 0.25);
        } else if (error < this.config.errorTolerance! / 32) {
            // Augmenter le pas
            nextStep = deltaTime * safetyFactor * Math.pow(this.config.errorTolerance! / error, 0.2);
        }

        // Contraindre le pas
        nextStep = Math.max(this.config.minStep!, Math.min(nextStep, this.config.maxStep!));

        return {
            state: halfStep2, // Solution plus précise
            nextStep,
            error
        };
    }
}