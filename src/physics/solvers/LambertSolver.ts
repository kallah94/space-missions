import * as THREE from 'three';
import { LambertConfig, LambertSolution, StateVector } from '../../types';

/**
 * Solveur pour le problème de Lambert (transfert orbital entre deux points)
 */
export class LambertSolver {
    private static readonly DEFAULT_TOLERANCE = 1e-12;
    private static readonly MAX_ITERATIONS = 100;

    /**
     * Résout le problème de Lambert
     */
    public static solve(config: LambertConfig): LambertSolution {
        const { mu, r1, r2, tof, clockwise = false, multiRevolution = 0 } = config;

        const r1Mag = r1.length();
        const r2Mag = r2.length();
        const cosDeltaNu = r1.dot(r2) / (r1Mag * r2Mag);

        // Vecteur normal au plan orbital
        const normal = new THREE.Vector3().crossVectors(r1, r2);
        let deltaNu = Math.acos(Math.max(-1, Math.min(1, cosDeltaNu)));

        // Ajuster pour sens de rotation
        if (clockwise && normal.z > 0) {
            deltaNu = 2 * Math.PI - deltaNu;
        } else if (!clockwise && normal.z < 0) {
            deltaNu = 2 * Math.PI - deltaNu;
        }

        // Ajouter révolutions multiples
        deltaNu += 2 * Math.PI * multiRevolution;

        // Paramètres géométriques
        const c = Math.sqrt(r1Mag * r1Mag + r2Mag * r2Mag - 2 * r1Mag * r2Mag * cosDeltaNu);
        const s = (r1Mag + r2Mag + c) / 2;

        // Temps de vol minimum (parabolique)
        const tofMin = this.calculateMinimumTOF(s, c, mu);

        if (tof < tofMin) {
            return {
                v1: new THREE.Vector3(),
                v2: new THREE.Vector3(),
                deltaV: Infinity,
                trajectory: [],
                feasible: false
            };
        }

        // Résoudre l'équation de Lambert
        const { a, p } = this.solveLambertEquation(s, c, tof, mu, multiRevolution, r1Mag, r2Mag);

        if (!isFinite(a) || !isFinite(p)) {
            return {
                v1: new THREE.Vector3(),
                v2: new THREE.Vector3(),
                deltaV: Infinity,
                trajectory: [],
                feasible: false
            };
        }

        // Calculer les vitesses
        const { v1, v2 } = this.calculateVelocities(r1, r2, a, p, mu, deltaNu, clockwise);

        // Calculer delta-V total
        const deltaV = v1.length() + v2.length();

        // Générer trajectoire
        const trajectory = this.generateTrajectory(r1, v1, tof, mu);

        return {
            v1,
            v2,
            deltaV,
            trajectory,
            feasible: true
        };
    }

    /**
     * Résout l'équation universelle de Lambert
     */
    private static solveLambertEquation(
        s: number,
        c: number,
        tof: number,
        mu: number,
        multiRev: number,
        r1Mag: number,
        r2Mag: number
    ): { a: number; p: number } {
        const lambda = Math.sqrt(1 - c / s);

        // Estimation initiale du demi-grand axe
        let a = s / 2;
        let alpha = 0;

        // Itération pour résoudre l'équation transcendante
        for (let i = 0; i < this.MAX_ITERATIONS; i++) {
            alpha = 2 * Math.asin(Math.sqrt(s / (2 * a)));
            const beta = 2 * Math.asin(Math.sqrt((s - c) / (2 * a)));

            let tofCalc: number;
            if (a > 0) {
                // Orbite elliptique
                tofCalc = Math.sqrt(a * a * a / mu) * (
                    (alpha - Math.sin(alpha)) - (beta - Math.sin(beta)) + 2 * Math.PI * multiRev
                );
            } else {
                // Orbite hyperbolique
                const alphaH = 2 * Math.asinh(Math.sqrt(s / (-2 * a)));
                const betaH = 2 * Math.asinh(Math.sqrt((s - c) / (-2 * a)));
                tofCalc = Math.sqrt((-a) * (-a) * (-a) / mu) * (
                    (Math.sinh(alphaH) - alphaH) - (Math.sinh(betaH) - betaH)
                );
                alpha = alphaH; // Pour le calcul de p
            }

            const error = tofCalc - tof;
            if (Math.abs(error) < this.DEFAULT_TOLERANCE) {
                break;
            }

            // Correction Newton-Raphson
            const dtda = this.calculateDTDA(a, s, c, mu, multiRev);
            a -= error / dtda;
        }

        // Paramètre semi-latus rectum
        const p = (4 * a * (s - r1Mag) * (s - r2Mag) * Math.sin(alpha / 2) * Math.sin(alpha / 2)) / (c * c);

        return { a, p };
    }

    /**
     * Calcule la dérivée dt/da pour Newton-Raphson
     */
    private static calculateDTDA(a: number, s: number, c: number, mu: number, multiRev: number): number {
        if (a > 0) {
            const alpha = 2 * Math.asin(Math.sqrt(s / (2 * a)));
            const beta = 2 * Math.asin(Math.sqrt((s - c) / (2 * a)));

            const dalphaDA = -Math.sqrt(s / (2 * a * a * a)) / Math.sqrt(1 - s / (2 * a));
            const dbetaDA = -Math.sqrt((s - c) / (2 * a * a * a)) / Math.sqrt(1 - (s - c) / (2 * a));

            return (3 / 2) * Math.sqrt(a / mu) * (
                (alpha - Math.sin(alpha)) - (beta - Math.sin(beta)) + 2 * Math.PI * multiRev
            ) + Math.sqrt(a * a * a / mu) * (
                (1 - Math.cos(alpha)) * dalphaDA - (1 - Math.cos(beta)) * dbetaDA
            );
        } else {
            // Cas hyperbolique (implémentation simplifiée)
            return 1;
        }
    }

    /**
     * Calcule les vitesses aux points de départ et d'arrivée
     */
    private static calculateVelocities(
        r1: THREE.Vector3,
        r2: THREE.Vector3,
        a: number,
        p: number,
        mu: number,
        deltaNu: number,
        clockwise: boolean
    ): { v1: THREE.Vector3; v2: THREE.Vector3 } {
        const r1Mag = r1.length();
        const r2Mag = r2.length();

        // Vecteurs unitaires
        const ur1 = r1.clone().normalize();
        const ur2 = r2.clone().normalize();

        // Plan orbital
        const h = new THREE.Vector3().crossVectors(r1, r2).normalize();
        if (clockwise) h.negate();

        // Vitesses radiales et tangentielles
        const sqrtMuP = Math.sqrt(mu / p);

        const vr1 = sqrtMuP * Math.sin(deltaNu) / Math.sin(Math.PI - deltaNu);
        const vr2 = -sqrtMuP * Math.sin(deltaNu) / Math.sin(Math.PI - deltaNu);

        const vt1 = sqrtMuP * (Math.cos(deltaNu) - 1) / Math.sin(Math.PI - deltaNu);
        const vt2 = sqrtMuP * (1 - Math.cos(deltaNu)) / Math.sin(Math.PI - deltaNu);

        // Directions tangentielles
        const ut1 = new THREE.Vector3().crossVectors(h, ur1).normalize();
        const ut2 = new THREE.Vector3().crossVectors(h, ur2).normalize();

        // Vitesses finales
        const v1 = ur1.clone().multiplyScalar(vr1).add(ut1.clone().multiplyScalar(vt1));
        const v2 = ur2.clone().multiplyScalar(vr2).add(ut2.clone().multiplyScalar(vt2));

        return { v1, v2 };
    }

    /**
     * Calcule le temps de vol minimum (trajectoire parabolique)
     */
    private static calculateMinimumTOF(s: number, c: number, mu: number): number {
        const a = s / 2;
        const sqrt2s = Math.sqrt(2 * s);
        const sqrt2sc = Math.sqrt(2 * (s - c));

        return (1 / 3) * Math.sqrt(2 / mu) * (
            s * sqrt2s - (s - c) * sqrt2sc
        );
    }

    /**
     * Génère une trajectoire intermédiaire
     */
    private static generateTrajectory(
        r0: THREE.Vector3,
        v0: THREE.Vector3,
        tof: number,
        mu: number,
        steps: number = 100
    ): StateVector[] {
        const trajectory: StateVector[] = [];
        const dt = tof / steps;

        let r = r0.clone();
        let v = v0.clone();

        for (let i = 0; i <= steps; i++) {
            trajectory.push({
                position: r.clone(),
                velocity: v.clone(),
                time: i * dt
            });

            if (i < steps) {
                // Propagation simplifiée (Euler amélioré)
                const a = r.clone().normalize().multiplyScalar(-mu / (r.lengthSq()));

                const rNext = r.clone().add(v.clone().multiplyScalar(dt)).add(a.clone().multiplyScalar(0.5 * dt * dt));
                const aNext = rNext.clone().normalize().multiplyScalar(-mu / (rNext.lengthSq()));
                const vNext = v.clone().add(a.clone().add(aNext).multiplyScalar(0.5 * dt));

                r = rNext;
                v = vNext;
            }
        }

        return trajectory;
    }

    /**
     * Résout le problème de Lambert avec révolutions multiples
     */
    public static solveMultiRevolution(
        config: LambertConfig,
        maxRevolutions: number = 3
    ): LambertSolution[] {
        const solutions: LambertSolution[] = [];

        for (let rev = 0; rev <= maxRevolutions; rev++) {
            const configRev = { ...config, multiRevolution: rev };
            const solution = this.solve(configRev);

            if (solution.feasible) {
                solutions.push(solution);
            }
        }

        // Trier par delta-V croissant
        return solutions.sort((a, b) => a.deltaV - b.deltaV);
    }

    /**
     * Trouve la solution optimale pour un transfert
     */
    public static findOptimalTransfer(
        config: LambertConfig,
        criterion: 'deltaV' | 'time' | 'fuel' = 'deltaV'
    ): LambertSolution {
        const solutions = this.solveMultiRevolution(config);

        if (solutions.length === 0) {
            return {
                v1: new THREE.Vector3(),
                v2: new THREE.Vector3(),
                deltaV: Infinity,
                trajectory: [],
                feasible: false
            };
        }

        // Retourner la première solution (déjà triée par delta-V)
        return solutions[0];
    }
}