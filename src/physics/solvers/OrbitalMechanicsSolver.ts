import * as THREE from 'three';
import { StateVector, OrbitalElements } from '../../types';

/**
 * Solveur général pour problèmes de mécanique orbitale
 */
export class OrbitalMechanicsSolver {
    private static readonly EARTH_MU = 398600.4418; // km³/s²
    private static readonly EARTH_RADIUS = 6371; // km

    /**
     * Convertit vecteur d'état vers éléments orbitaux
     */
    public static stateVectorToElements(
        state: StateVector,
        mu: number = this.EARTH_MU
    ): OrbitalElements {
        const r = state.position;
        const v = state.velocity;
        const rMag = r.length();
        const vMag = v.length();

        // Vecteur moment angulaire
        const h = new THREE.Vector3().crossVectors(r, v);
        const hMag = h.length();

        // Énergie spécifique
        const energy = (vMag * vMag) / 2 - mu / rMag;
        const a = -mu / (2 * energy);

        // Vecteur excentricité
        const eVector = new THREE.Vector3()
            .crossVectors(v, h)
            .divideScalar(mu)
            .sub(r.clone().normalize());
        const e = eVector.length();

        // Inclinaison
        const i = Math.acos(Math.max(-1, Math.min(1, h.z / hMag)));

        // Vecteur ligne des nœuds
        const n = new THREE.Vector3(-h.y, h.x, 0);
        const nMag = n.length();

        // Longitude du nœud ascendant
        let Omega = 0;
        if (nMag > 1e-10) {
            Omega = Math.acos(Math.max(-1, Math.min(1, n.x / nMag)));
            if (n.y < 0) Omega = 2 * Math.PI - Omega;
        }

        // Argument du périgée
        let omega = 0;
        if (nMag > 1e-10 && e > 1e-10) {
            omega = Math.acos(Math.max(-1, Math.min(1, n.dot(eVector) / (nMag * e))));
            if (eVector.z < 0) omega = 2 * Math.PI - omega;
        } else if (e > 1e-10) {
            omega = Math.atan2(eVector.y, eVector.x);
        }

        // Anomalie vraie
        let nu = 0;
        if (e > 1e-10) {
            nu = Math.acos(Math.max(-1, Math.min(1, eVector.dot(r) / (e * rMag))));
            if (r.dot(v) < 0) nu = 2 * Math.PI - nu;
        } else {
            // Orbite circulaire
            if (nMag > 1e-10) {
                nu = Math.acos(Math.max(-1, Math.min(1, n.dot(r) / (nMag * rMag))));
                if (r.z < 0) nu = 2 * Math.PI - nu;
            } else {
                nu = Math.atan2(r.y, r.x);
            }
        }

        return {
            semiMajorAxis: a,
            eccentricity: e,
            inclination: i,
            longitudeOfAscendingNode: Omega,
            argumentOfPeriapsis: omega,
            trueAnomaly: nu,
            epoch: new Date()
        };
    }

    /**
     * Convertit éléments orbitaux vers vecteur d'état
     */
    public static elementsToStateVector(
        elements: OrbitalElements,
        mu: number = this.EARTH_MU
    ): StateVector {
        const { semiMajorAxis: a, eccentricity: e, inclination: i,
            longitudeOfAscendingNode: Omega, argumentOfPeriapsis: omega, trueAnomaly: nu } = elements;

        // Position et vitesse dans le plan orbital
        const p = a * (1 - e * e);
        const r = p / (1 + e * Math.cos(nu));

        const x_orb = r * Math.cos(nu);
        const y_orb = r * Math.sin(nu);

        const h = Math.sqrt(mu * p);
        const vx_orb = -(mu / h) * Math.sin(nu);
        const vy_orb = (mu / h) * (e + Math.cos(nu));

        // Matrices de rotation
        const cosOmega = Math.cos(Omega);
        const sinOmega = Math.sin(Omega);
        const cosI = Math.cos(i);
        const sinI = Math.sin(i);
        const cosW = Math.cos(omega);
        const sinW = Math.sin(omega);

        // Matrice de transformation du plan orbital vers inertiel
        const P11 = cosOmega * cosW - sinOmega * sinW * cosI;
        const P12 = -cosOmega * sinW - sinOmega * cosW * cosI;
        const P21 = sinOmega * cosW + cosOmega * sinW * cosI;
        const P22 = -sinOmega * sinW + cosOmega * cosW * cosI;
        const P31 = sinW * sinI;
        const P32 = cosW * sinI;

        // Position inertielle
        const position = new THREE.Vector3(
            P11 * x_orb + P12 * y_orb,
            P21 * x_orb + P22 * y_orb,
            P31 * x_orb + P32 * y_orb
        );

        // Vitesse inertielle
        const velocity = new THREE.Vector3(
            P11 * vx_orb + P12 * vy_orb,
            P21 * vx_orb + P22 * vy_orb,
            P31 * vx_orb + P32 * vy_orb
        );

        return {
            position,
            velocity,
            time: 0
        };
    }

    /**
     * Calcule les caractéristiques orbitales
     */
    public static calculateOrbitalCharacteristics(
        elements: OrbitalElements,
        mu: number = this.EARTH_MU
    ): {
        period: number;
        meanMotion: number;
        apogeeAltitude: number;
        perigeeAltitude: number;
        apogeeVelocity: number;
        perigeeVelocity: number;
        specificEnergy: number;
        angularMomentum: number;
    } {
        const { semiMajorAxis: a, eccentricity: e } = elements;

        const period = 2 * Math.PI * Math.sqrt(a * a * a / mu);
        const meanMotion = 2 * Math.PI / period;

        const apogeeRadius = a * (1 + e);
        const perigeeRadius = a * (1 - e);
        const apogeeAltitude = apogeeRadius - this.EARTH_RADIUS;
        const perigeeAltitude = perigeeRadius - this.EARTH_RADIUS;

        const apogeeVelocity = Math.sqrt(mu * (2 / apogeeRadius - 1 / a));
        const perigeeVelocity = Math.sqrt(mu * (2 / perigeeRadius - 1 / a));

        const specificEnergy = -mu / (2 * a);
        const angularMomentum = Math.sqrt(mu * a * (1 - e * e));

        return {
            period,
            meanMotion,
            apogeeAltitude,
            perigeeAltitude,
            apogeeVelocity,
            perigeeVelocity,
            specificEnergy,
            angularMomentum
        };
    }

    /**
     * Calcule l'anomalie vraie à un temps donné
     */
    public static trueAnomalyAtTime(
        elements: OrbitalElements,
        deltaTime: number,
        mu: number = this.EARTH_MU
    ): number {
        const { semiMajorAxis: a, eccentricity: e, trueAnomaly: nu0 } = elements;

        const n = Math.sqrt(mu / (a * a * a));

        // Anomalie moyenne initiale
        const E0 = this.trueToEccentricAnomaly(nu0, e);
        const M0 = E0 - e * Math.sin(E0);

        // Nouvelle anomalie moyenne
        const M = M0 + n * deltaTime;

        // Résoudre l'équation de Kepler
        const E = this.solveKeplerEquation(M, e);

        // Convertir vers anomalie vraie
        return this.eccentricToTrueAnomaly(E, e);
    }

    /**
     * Calcule le temps de passage entre deux anomalies vraies
     */
    public static timeOfFlightBetweenAnomalies(
        nu1: number,
        nu2: number,
        elements: OrbitalElements,
        mu: number = this.EARTH_MU
    ): number {
        const { semiMajorAxis: a, eccentricity: e } = elements;
        const n = Math.sqrt(mu / (a * a * a));

        const E1 = this.trueToEccentricAnomaly(nu1, e);
        const E2 = this.trueToEccentricAnomaly(nu2, e);

        const M1 = E1 - e * Math.sin(E1);
        const M2 = E2 - e * Math.sin(E2);

        let deltaM = M2 - M1;
        if (deltaM < 0) deltaM += 2 * Math.PI;

        return deltaM / n;
    }

    /**
     * Détermine le type d'orbite
     */
    public static classifyOrbit(
        elements: OrbitalElements
    ): {
        type: 'circular' | 'elliptical' | 'parabolic' | 'hyperbolic';
        subtype?: 'equatorial' | 'inclined' | 'polar' | 'retrograde';
        altitude: 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'escape';
    } {
        const { semiMajorAxis: a, eccentricity: e, inclination: i } = elements;

        // Type principal
        let type: 'circular' | 'elliptical' | 'parabolic' | 'hyperbolic';
        if (e < 0.01) type = 'circular';
        else if (e < 1) type = 'elliptical';
        else if (Math.abs(e - 1) < 0.01) type = 'parabolic';
        else type = 'hyperbolic';

        // Sous-type basé sur l'inclinaison
        let subtype: 'equatorial' | 'inclined' | 'polar' | 'retrograde' | undefined;
        const incDeg = i * 180 / Math.PI;
        if (incDeg < 10) subtype = 'equatorial';
        else if (incDeg > 80 && incDeg < 100) subtype = 'polar';
        else if (incDeg > 90) subtype = 'retrograde';
        else subtype = 'inclined';

        // Altitude
        let altitude: 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'escape';
        const perigeeAlt = a * (1 - e) - this.EARTH_RADIUS;
        const apogeeAlt = a * (1 + e) - this.EARTH_RADIUS;

        if (e >= 1) altitude = 'escape';
        else if (apogeeAlt > 35786 && Math.abs(apogeeAlt - 35786) < 100) altitude = 'GEO';
        else if (apogeeAlt > 35786) altitude = 'HEO';
        else if (perigeeAlt > 2000) altitude = 'MEO';
        else altitude = 'LEO';

        return { type, subtype, altitude };
    }

    /**
     * Calcule les perturbations J2
     */
    public static calculateJ2Perturbations(
        elements: OrbitalElements,
        deltaTime: number,
        J2: number = 1.08262668e-3
    ): {
        deltaOmega: number;
        deltaRaan: number;
        deltaMeanAnomaly: number;
    } {
        const { semiMajorAxis: a, eccentricity: e, inclination: i } = elements;
        const earthRadius = this.EARTH_RADIUS;

        const n = Math.sqrt(this.EARTH_MU / (a * a * a));
        const p = a * (1 - e * e);

        const factor = -1.5 * J2 * (earthRadius / p) * (earthRadius / p) * n;

        // Précession du périgée
        const deltaOmega = factor * (2 - 2.5 * Math.sin(i) * Math.sin(i)) * deltaTime;

        // Précession des nœuds
        const deltaRaan = factor * Math.cos(i) * deltaTime;

        // Variation de l'anomalie moyenne
        const deltaMeanAnomaly = factor * Math.sqrt(1 - e * e) *
            (1 - 1.5 * Math.sin(i) * Math.sin(i)) * deltaTime;

        return { deltaOmega, deltaRaan, deltaMeanAnomaly };
    }

    /**
     * Utilitaires privés
     */
    private static solveKeplerEquation(M: number, e: number): number {
        let E = M;
        for (let i = 0; i < 10; i++) {
            const deltaE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
            E -= deltaE;
            if (Math.abs(deltaE) < 1e-12) break;
        }
        return E;
    }

    private static trueToEccentricAnomaly(nu: number, e: number): number {
        return Math.atan2(
            Math.sqrt(1 - e * e) * Math.sin(nu),
            e + Math.cos(nu)
        );
    }

    private static eccentricToTrueAnomaly(E: number, e: number): number {
        return Math.atan2(
            Math.sqrt(1 - e * e) * Math.sin(E),
            Math.cos(E) - e
        );
    }
}