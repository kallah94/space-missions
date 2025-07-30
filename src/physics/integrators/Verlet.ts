import * as THREE from 'three';
import { Integrator } from './Integrator';
import { StateVector, StateDerivative, IntegratorConfig } from '../../types';

/**
 * Intégrateur Verlet pour systèmes conservatifs
 * Excellent pour la stabilité énergétique à long terme
 */
export class Verlet extends Integrator {
    private previousAcceleration?: StateVector;

    constructor(config: Partial<IntegratorConfig> = {}) {
        super({ ...config, method: 'verlet' });
    }

    /**
     * Pas d'intégration Verlet
     */
    public step(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): StateVector {
        const dt = deltaTime;
        const dt2 = dt * dt;

        // Calculer l'accélération actuelle
        const currentAccel = derivative(state, state.time);

        let newPosition: THREE.Vector3;

        if (this.previousAcceleration) {
            // Verlet standard: x(t+dt) = 2*x(t) - x(t-dt) + a(t)*dt²
            // Mais nous n'avons que l'état actuel, donc on utilise Velocity-Verlet

            // Position: x(t+dt) = x(t) + v(t)*dt + 0.5*a(t)*dt²
            newPosition = state.position.clone()
                .add(state.velocity.clone().multiplyScalar(dt))
                .add(currentAccel.velocity.clone().multiplyScalar(0.5 * dt2));

        } else {
            // Premier pas - utiliser Euler modifié
            newPosition = state.position.clone()
                .add(state.velocity.clone().multiplyScalar(dt))
                .add(currentAccel.velocity.clone().multiplyScalar(0.5 * dt2));
        }

        // État temporaire pour calculer la nouvelle accélération
        const tempState: StateVector = {
            position: newPosition,
            velocity: state.velocity.clone(), // Temporaire
            time: state.time + dt
        };

        // Nouvelle accélération
        const newAccel = derivative(tempState, state.time + dt);

        // Vitesse: v(t+dt) = v(t) + 0.5*[a(t) + a(t+dt)]*dt
        const newVelocity = state.velocity.clone()
            .add(currentAccel.velocity.clone().multiplyScalar(0.5 * dt))
            .add(newAccel.velocity.clone().multiplyScalar(0.5 * dt));

        // Sauvegarder l'accélération pour le prochain pas
        this.previousAcceleration = currentAccel;

        return {
            position: newPosition,
            velocity: newVelocity,
            time: state.time + dt
        };
    }

    /**
     * Réinitialise l'intégrateur (nécessaire pour Verlet)
     */
    public reset(): void {
        this.previousAcceleration = undefined;
        this.stepCount = 0;
        this.totalError = 0;
    }

    /**
     * Verlet préserve mieux l'énergie, pas d'adaptation nécessaire
     */
    protected override adaptiveStep(
        state: StateVector,
        derivative: StateDerivative,
        deltaTime: number
    ): { state: StateVector; nextStep: number; error: number } {
        const newState = this.step(state, derivative, deltaTime);

        // Pour Verlet, on peut estimer l'erreur en comparant avec Euler
        const eulerState: StateVector = {
            position: state.position.clone().add(state.velocity.clone().multiplyScalar(deltaTime)),
            velocity: state.velocity.clone().add(derivative(state, state.time).velocity.clone().multiplyScalar(deltaTime)),
            time: state.time + deltaTime
        };

        const error = this.calculateError(newState, eulerState);

        return {
            state: newState,
            nextStep: deltaTime, // Verlet fonctionne mieux avec un pas constant
            error
        };
    }

    /**
     * Calcule l'énergie du système (pour vérification de conservation)
     */
    public calculateEnergy(state: StateVector, potential: (pos: THREE.Vector3) => number): number {
        const kineticEnergy = 0.5 * state.velocity.lengthSq();
        const potentialEnergy = potential(state.position);
        return kineticEnergy + potentialEnergy;
    }
}