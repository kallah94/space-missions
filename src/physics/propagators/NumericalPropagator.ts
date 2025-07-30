import * as THREE from 'three';
import { OrbitalPropagator } from './OrbitalPropagator';
import { StateVector } from '../../types';
import { RungeKutta4 } from '../integrators';

/**
 * Propagateur numérique avec intégration RK4
 */
export class NumericalPropagator extends OrbitalPropagator {
    private integrator: RungeKutta4;
    private perturbationForces: ((pos: THREE.Vector3, vel: THREE.Vector3, t: number) => THREE.Vector3)[] = [];

    constructor(mu: number = 398600.4418, epoch: Date = new Date()) {
        super(mu, epoch);
        this.integrator = new RungeKutta4();
    }

    /**
     * Ajoute une force de perturbation
     */
    addPerturbationForce(force: (pos: THREE.Vector3, vel: THREE.Vector3, t: number) => THREE.Vector3): void {
        this.perturbationForces.push(force);
    }

    /**
     * Propage numériquement avec RK4
     */
    propagate(
        initialState: StateVector,
        timeStep: number,
        duration: number
    ): StateVector[] {
        return this.integrator.integrate(
            initialState,
            (state: StateVector, t: number) => this.stateDerivative(state, t),
            timeStep,
            duration
        );
    }

    /**
     * Propage un seul pas de temps
     */
    propagateStep(state: StateVector, deltaTime: number): StateVector {
        return this.integrator.step(
            state,
            (s: StateVector, t: number) => this.stateDerivative(s, t),
            deltaTime
        );
    }

    /**
     * Calcule l'accélération totale incluant perturbations
     */
    calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        time: number
    ): THREE.Vector3 {
        // Accélération gravitationnelle principale
        const r = position.length();
        const gravitationalAccel = position.clone().normalize().multiplyScalar(-this.mu / (r * r));

        // Ajouter les perturbations
        let totalAcceleration = gravitationalAccel;
        for (const perturbation of this.perturbationForces) {
            totalAcceleration.add(perturbation(position, velocity, time));
        }

        return totalAcceleration;
    }

    /**
     * Calcule la dérivée du vecteur d'état
     */
    private stateDerivative(state: StateVector, time: number): StateVector {
        const acceleration = this.calculateAcceleration(state.position, state.velocity, time);

        return {
            position: state.velocity.clone(),
            velocity: acceleration,
            time: time
        };
    }
}
