import * as THREE from 'three';
import { Integrator } from './Integrator';
import { StateVector, StateDerivative, IntegratorConfig } from '../../types';

/**
 * Intégrateur Runge-Kutta-Fehlberg RK4(5)
 * Méthode embedded avec contrôle d'erreur automatique
 */
export class RungeKuttaFehlberg extends Integrator {
    // Coefficients du tableau de Butcher pour RKF45
    private readonly a = [
        [0],
        [1/4],
        [3/32, 9/32],
        [1932/2197, -7200/2197, 7296/2197],
        [439/216, -8, 3680/513, -845/4104],
        [-8/27, 2, -3544/2565, 1859/4104, -11/40]
    ];

    private readonly b4 = [25/216, 0, 1408/2565, 2197/4104, -1/5, 0]; // Ordre 4
    private readonly b5 = [16/135, 0, 6656/12825, 28561/56430, -9/50, 2/55]; // Ordre 5
    private readonly c = [0, 1/4, 3/8, 12/13, 1, 1/2];

    constructor(config: Partial<IntegratorConfig> = {}) {
        super({ ...config, method: 'rkf45', adaptiveStep: true });
    }

    /**
     * Pas RKF45 avec estimation d'erreur intégrée
     */
    public step(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): StateVector {
        const dt = deltaTime;

        // Calcul des k_i
        const k: StateVector[] = [];

        // k1
        k[0] = derivative(state, state.time);

        // k2 à k6
        for (let i = 1; i < 6; i++) {
            let tempState = this.cloneState(state);

            for (let j = 0; j < i; j++) {
                tempState = this.addStates(tempState, k[j], dt * this.a[i][j]);
            }

            k[i] = derivative(tempState, state.time + this.c[i] * dt);
        }

        // Solution d'ordre 5 (plus précise)
        let newPosition = state.position.clone();
        let newVelocity = state.velocity.clone();

        for (let i = 0; i < 6; i++) {
            newPosition.add(k[i].position.clone().multiplyScalar(dt * this.b5[i]));
            newVelocity.add(k[i].velocity.clone().multiplyScalar(dt * this.b5[i]));
        }

        return {
            position: newPosition,
            velocity: newVelocity,
            time: state.time + dt
        };
    }

    /**
     * Pas adaptatif natif de RKF45
     */
    protected override adaptiveStep(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): { state: StateVector; nextStep: number; error: number } {
        const dt = deltaTime;

        // Calcul des k_i
        const k: StateVector[] = [];

        k[0] = derivative(state, state.time);

        for (let i = 1; i < 6; i++) {
            let tempState = this.cloneState(state);

            for (let j = 0; j < i; j++) {
                tempState = this.addStates(tempState, k[j], dt * this.a[i][j]);
            }

            k[i] = derivative(tempState, state.time + this.c[i] * dt);
        }

        // Solutions d'ordre 4 et 5
        let y4_pos = state.position.clone();
        let y4_vel = state.velocity.clone();
        let y5_pos = state.position.clone();
        let y5_vel = state.velocity.clone();

        for (let i = 0; i < 6; i++) {
            y4_pos.add(k[i].position.clone().multiplyScalar(dt * this.b4[i]));
            y4_vel.add(k[i].velocity.clone().multiplyScalar(dt * this.b4[i]));
            y5_pos.add(k[i].position.clone().multiplyScalar(dt * this.b5[i]));
            y5_vel.add(k[i].velocity.clone().multiplyScalar(dt * this.b5[i]));
        }

        const state4: StateVector = { position: y4_pos, velocity: y4_vel, time: state.time + dt };
        const state5: StateVector = { position: y5_pos, velocity: y5_vel, time: state.time + dt };

        // Estimation d'erreur
        const error = this.calculateError(state4, state5);

        // Contrôle du pas de temps
        let nextStep = deltaTime;
        const safetyFactor = 0.84;

        if (error > this.config.errorTolerance!) {
            nextStep = deltaTime * safetyFactor * Math.pow(this.config.errorTolerance! / error, 0.25);
        } else if (error < this.config.errorTolerance! / 32) {
            nextStep = deltaTime * safetyFactor * Math.pow(this.config.errorTolerance! / error, 0.2);
        }

        nextStep = Math.max(this.config.minStep!, Math.min(nextStep, this.config.maxStep!));

        return {
            state: state5, // Utiliser la solution d'ordre 5
            nextStep,
            error
        };
    }
}
