import * as THREE from 'three';
import { StateVector, OrbitalElements } from '../../types';

/**
 * Solveur pour l'équation de Kepler et conversions associées
 */
export class KeplerSolver {
    private static readonly DEFAULT_TOLERANCE = 1e-12;
    private static readonly MAX_ITERATIONS = 50;

    /**
     * Résout l'équation de Kepler : M = E - e*sin(E)
     * Utilise la méthode de Newton-Raphson
     */
    public static solveKeplerEquation(
        meanAnomaly: number,
        eccentricity: number,
        tolerance: number = this.DEFAULT_TOLERANCE
    ): number {
        // Normaliser l'anomalie moyenne
        const M = this.normalizeAngle(meanAnomaly);

        // Estimation initiale
        let E = M + eccentricity * Math.sin(M);

        // Méthode de Newton-Raphson
        for (let i = 0; i < this.MAX_ITERATIONS; i++) {
            const f = E - eccentricity * Math.sin(E) - M;
            const fp = 1 - eccentricity * Math.cos(E);

            const deltaE = f / fp;
            E -= deltaE;

            if (Math.abs(deltaE) < tolerance) {
                return E;
            }
        }

        throw new Error(`Kepler equation did not converge after ${this.MAX_ITERATIONS} iterations`);
    }

    /**
     * Résout l'équation de Kepler hyperbolique : M = e*sinh(H) - H
     */
    public static solveKeplerHyperbolic(
        meanAnomaly: number,
        eccentricity: number,
        tolerance: number = this.DEFAULT_TOLERANCE
    ): number {
        if (eccentricity <= 1) {
            throw new Error('Hyperbolic Kepler equation requires eccentricity > 1');
        }

        const M = meanAnomaly;
        let H = Math.log(2 * Math.abs(M) / eccentricity + 1.8);

        if (M < 0) H = -H;

        for (let i = 0; i < this.MAX_ITERATIONS; i++) {
            const f = eccentricity * Math.sinh(H) - H - M;
            const fp = eccentricity * Math.cosh(H) - 1;

            const deltaH = f / fp;
            H -= deltaH;

            if (Math.abs(deltaH) < tolerance) {
                return H;
            }
        }

        throw new Error(`Hyperbolic Kepler equation did not converge`);
    }

    /**
     * Convertit anomalie excentrique vers anomalie vraie
     */
    public static eccentricToTrueAnomaly(
        eccentricAnomaly: number,
        eccentricity: number
    ): number {
        if (eccentricity < 1) {
            // Orbite elliptique
            return 2 * Math.atan2(
                Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
                Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
            );
        } else {
            // Orbite hyperbolique
            return 2 * Math.atan2(
                Math.sqrt(eccentricity + 1) * Math.sinh(eccentricAnomaly / 2),
                Math.sqrt(eccentricity - 1) * Math.cosh(eccentricAnomaly / 2)
            );
        }
    }

    /**
     * Convertit anomalie vraie vers anomalie excentrique
     */
    public static trueToEccentricAnomaly(
        trueAnomaly: number,
        eccentricity: number
    ): number {
        if (eccentricity < 1) {
            // Orbite elliptique
            return 2 * Math.atan2(
                Math.sqrt(1 - eccentricity) * Math.sin(trueAnomaly / 2),
                Math.sqrt(1 + eccentricity) * Math.cos(trueAnomaly / 2)
            );
        } else {
            // Orbite hyperbolique
            return 2 * Math.atanh(
                Math.sqrt((eccentricity - 1) / (eccentricity + 1)) * Math.tan(trueAnomaly / 2)
            );
        }
    }

    /**
     * Calcule l'anomalie moyenne à partir de l'anomalie vraie
     */
    public static trueToMeanAnomaly(
        trueAnomaly: number,
        eccentricity: number
    ): number {
        const E = this.trueToEccentricAnomaly(trueAnomaly, eccentricity);

        if (eccentricity < 1) {
            return E - eccentricity * Math.sin(E);
        } else {
            return eccentricity * Math.sinh(E) - E;
        }
    }

    /**
     * Calcule l'anomalie vraie à partir de l'anomalie moyenne
     */
    public static meanToTrueAnomaly(
        meanAnomaly: number,
        eccentricity: number
    ): number {
        if (eccentricity < 1) {
            const E = this.solveKeplerEquation(meanAnomaly, eccentricity);
            return this.eccentricToTrueAnomaly(E, eccentricity);
        } else {
            const H = this.solveKeplerHyperbolic(meanAnomaly, eccentricity);
            return this.eccentricToTrueAnomaly(H, eccentricity);
        }
    }

    /**
     * Calcule le temps de vol entre deux anomalies vraies
     */
    public static timeOfFlight(
        nu1: number,
        nu2: number,
        semiMajorAxis: number,
        eccentricity: number,
        mu: number = 398600.4418
    ): number {
        const M1 = this.trueToMeanAnomaly(nu1, eccentricity);
        const M2 = this.trueToMeanAnomaly(nu2, eccentricity);

        let deltaM = M2 - M1;

        // Assurer que deltaM est positif
        if (deltaM < 0) {
            deltaM += 2 * Math.PI;
        }

        const n = Math.sqrt(mu / Math.pow(Math.abs(semiMajorAxis), 3));
        return deltaM / n;
    }

    /**
     * Propage une orbite képlérienne dans le temps
     */
    public static propagateKepler(
        elements: OrbitalElements,
        deltaTime: number,
        mu: number = 398600.4418
    ): OrbitalElements {
        const n = Math.sqrt(mu / Math.pow(elements.semiMajorAxis, 3));
        const M0 = this.trueToMeanAnomaly(elements.trueAnomaly, elements.eccentricity);
        const M = M0 + n * deltaTime;
        const nu = this.meanToTrueAnomaly(M, elements.eccentricity);

        return {
            ...elements,
            trueAnomaly: nu,
            epoch: new Date(elements.epoch.getTime() + deltaTime * 1000)
        };
    }

    /**
     * Calcule la position et vitesse orbitales à partir de l'anomalie vraie
     */
    public static orbitalStateFromAnomaly(
        trueAnomaly: number,
        elements: OrbitalElements,
        mu: number = 398600.4418
    ): { position: THREE.Vector3; velocity: THREE.Vector3 } {
        const { semiMajorAxis: a, eccentricity: e } = elements;
        const p = a * (1 - e * e);
        const r = p / (1 + e * Math.cos(trueAnomaly));

        // Position dans le plan orbital
        const x = r * Math.cos(trueAnomaly);
        const y = r * Math.sin(trueAnomaly);

        // Vitesse dans le plan orbital
        const h = Math.sqrt(mu * p);
        const vx = -(mu / h) * Math.sin(trueAnomaly);
        const vy = (mu / h) * (e + Math.cos(trueAnomaly));

        return {
            position: new THREE.Vector3(x, y, 0),
            velocity: new THREE.Vector3(vx, vy, 0)
        };
    }

    /**
     * Calcule les caractéristiques orbitales
     */
    public static getOrbitalCharacteristics(
        elements: OrbitalElements,
        mu: number = 398600.4418
    ): {
        period: number;
        apoapsis: number;
        periapsis: number;
        meanMotion: number;
        specificEnergy: number;
    } {
        const { semiMajorAxis: a, eccentricity: e } = elements;
        const earthRadius = 6371; // km

        const period = 2 * Math.PI * Math.sqrt(a * a * a / mu);
        const apoapsis = a * (1 + e) - earthRadius;
        const periapsis = a * (1 - e) - earthRadius;
        const meanMotion = Math.sqrt(mu / (a * a * a));
        const specificEnergy = -mu / (2 * a);

        return {
            period,
            apoapsis,
            periapsis,
            meanMotion,
            specificEnergy
        };
    }

    /**
     * Normalise un angle entre 0 et 2π
     */
    private static normalizeAngle(angle: number): number {
        while (angle < 0) angle += 2 * Math.PI;
        while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
        return angle;
    }
}