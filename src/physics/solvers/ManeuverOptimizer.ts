import * as THREE from 'three';
import { OrbitalElements, StateVector, ManeuverOptimizationConfig } from '../../types';
import { LambertSolver } from './LambertSolver';
import { KeplerSolver } from './KeplerSolver';

/**
 * Optimiseur de manœuvres orbitales
 */
export class ManeuverOptimizer {
    /**
     * Calcule un transfert de Hohmann
     */
    public static hohmannTransfer(
        r1: number,
        r2: number,
        mu: number = 398600.4418
    ): {
        deltaV1: number;
        deltaV2: number;
        totalDeltaV: number;
        transferTime: number;
        semiMajorAxis: number;
    } {
        const a_transfer = (r1 + r2) / 2;
        const v1_circular = Math.sqrt(mu / r1);
        const v2_circular = Math.sqrt(mu / r2);

        // Vitesses sur l'orbite de transfert
        const v1_transfer = Math.sqrt(mu * (2 / r1 - 1 / a_transfer));
        const v2_transfer = Math.sqrt(mu * (2 / r2 - 1 / a_transfer));

        const deltaV1 = Math.abs(v1_transfer - v1_circular);
        const deltaV2 = Math.abs(v2_circular - v2_transfer);
        const totalDeltaV = deltaV1 + deltaV2;

        const transferTime = Math.PI * Math.sqrt(a_transfer * a_transfer * a_transfer / mu);

        return {
            deltaV1,
            deltaV2,
            totalDeltaV,
            transferTime,
            semiMajorAxis: a_transfer
        };
    }

    /**
     * Calcule un transfert bi-elliptique
     */
    public static biellipticTransfer(
        r1: number,
        r2: number,
        rb: number, // Rayon de l'orbite intermédiaire
        mu: number = 398600.4418
    ): {
        deltaV1: number;
        deltaV2: number;
        deltaV3: number;
        totalDeltaV: number;
        transferTime1: number;
        transferTime2: number;
        totalTime: number;
    } {
        const v1_circular = Math.sqrt(mu / r1);
        const v2_circular = Math.sqrt(mu / r2);

        // Première ellipse de transfert (r1 -> rb)
        const a1 = (r1 + rb) / 2;
        const v1_transfer1 = Math.sqrt(mu * (2 / r1 - 1 / a1));
        const vb_transfer1 = Math.sqrt(mu * (2 / rb - 1 / a1));

        // Deuxième ellipse de transfert (rb -> r2)
        const a2 = (rb + r2) / 2;
        const vb_transfer2 = Math.sqrt(mu * (2 / rb - 1 / a2));
        const v2_transfer2 = Math.sqrt(mu * (2 / r2 - 1 / a2));

        const deltaV1 = Math.abs(v1_transfer1 - v1_circular);
        const deltaV2 = Math.abs(vb_transfer2 - vb_transfer1);
        const deltaV3 = Math.abs(v2_circular - v2_transfer2);
        const totalDeltaV = deltaV1 + deltaV2 + deltaV3;

        const transferTime1 = Math.PI * Math.sqrt(a1 * a1 * a1 / mu);
        const transferTime2 = Math.PI * Math.sqrt(a2 * a2 * a2 / mu);
        const totalTime = transferTime1 + transferTime2;

        return {
            deltaV1,
            deltaV2,
            deltaV3,
            totalDeltaV,
            transferTime1,
            transferTime2,
            totalTime
        };
    }

    /**
     * Optimise un changement de plan orbital
     */
    public static planeChangeOptimization(
        currentInclination: number,
        targetInclination: number,
        currentRadius: number,
        mu: number = 398600.4418
    ): {
        optimalRadius: number;
        deltaVAtCurrent: number;
        deltaVAtOptimal: number;
        savings: number;
    } {
        const deltaI = Math.abs(targetInclination - currentInclination);
        const vCurrent = Math.sqrt(mu / currentRadius);

        // Delta-V pour changement de plan à l'altitude actuelle
        const deltaVAtCurrent = 2 * vCurrent * Math.sin(deltaI / 2);

        // Optimisation : changement de plan à l'apogée d'une orbite elliptique
        // Pour minimiser le delta-V, effectuer le changement à l'apogée
        const optimalRadius = currentRadius; // Simplifié - en réalité dépend de la stratégie
        const vOptimal = Math.sqrt(mu / optimalRadius);
        const deltaVAtOptimal = 2 * vOptimal * Math.sin(deltaI / 2);

        const savings = deltaVAtCurrent - deltaVAtOptimal;

        return {
            optimalRadius,
            deltaVAtCurrent,
            deltaVAtOptimal,
            savings
        };
    }

    /**
     * Calcule une manœuvre de rendez-vous optimal
     */
    public static rendezvousOptimization(
        chaserState: StateVector,
        targetState: StateVector,
        timeWindow: number,
        mu: number = 398600.4418
    ): {
        optimalTime: number;
        deltaV: number;
        maneuvers: Array<{
            time: number;
            deltaV: THREE.Vector3;
            position: THREE.Vector3;
        }>;
    } {
        const dt = timeWindow / 100;
        let bestSolution: any = null;
        let minDeltaV = Infinity;

        // Recherche sur la fenêtre temporelle
        for (let t = 0; t <= timeWindow; t += dt) {
            // Propager les états
            const chaserElements = this.stateToElements(chaserState, mu);
            const targetElements = this.stateToElements(targetState, mu);

            const chaserProp = KeplerSolver.propagateKepler(chaserElements, t, mu);
            const targetProp = KeplerSolver.propagateKepler(targetElements, t, mu);

            const chaserPos = this.elementsToPosition(chaserProp, mu);
            const targetPos = this.elementsToPosition(targetProp, mu);

            // Résoudre Lambert pour ce temps
            try {
                const lambertSolution = LambertSolver.solve({
                    mu,
                    r1: chaserState.position,
                    r2: targetPos,
                    tof: t
                });

                if (lambertSolution.feasible && lambertSolution.deltaV < minDeltaV) {
                    minDeltaV = lambertSolution.deltaV;
                    bestSolution = {
                        time: t,
                        solution: lambertSolution
                    };
                }
            } catch (error) {
                continue;
            }
        }

        if (!bestSolution) {
            return {
                optimalTime: 0,
                deltaV: Infinity,
                maneuvers: []
            };
        }

        return {
            optimalTime: bestSolution.time,
            deltaV: bestSolution.solution.deltaV,
            maneuvers: [{
                time: 0,
                deltaV: bestSolution.solution.v1.clone().sub(chaserState.velocity),
                position: chaserState.position.clone()
            }]
        };
    }

    /**
     * Optimise une séquence de manœuvres multi-impulsions
     */
    public static multiImpulseOptimization(
        initialOrbit: OrbitalElements,
        targetOrbit: OrbitalElements,
        maxImpulses: number = 3,
        mu: number = 398600.4418
    ): {
        maneuvers: Array<{
            deltaV: THREE.Vector3;
            trueAnomaly: number;
            deltaVMagnitude: number;
        }>;
        totalDeltaV: number;
        feasible: boolean;
    } {
        // Stratégie simplifiée : optimisation séquentielle
        const maneuvers: Array<{
            deltaV: THREE.Vector3;
            trueAnomaly: number;
            deltaVMagnitude: number;
        }> = [];

        // Changement d'inclinaison optimal (aux nœuds)
        if (Math.abs(targetOrbit.inclination - initialOrbit.inclination) > 1e-6) {
            const deltaI = targetOrbit.inclination - initialOrbit.inclination;
            const nodeAnomaly = -initialOrbit.argumentOfPeriapsis; // Nœud ascendant

            const r = initialOrbit.semiMajorAxis * (1 - initialOrbit.eccentricity * initialOrbit.eccentricity) /
                (1 + initialOrbit.eccentricity * Math.cos(nodeAnomaly));
            const v = Math.sqrt(mu / r);
            const deltaV = 2 * v * Math.sin(Math.abs(deltaI) / 2);

            maneuvers.push({
                deltaV: new THREE.Vector3(0, deltaV, 0),
                trueAnomaly: nodeAnomaly,
                deltaVMagnitude: deltaV
            });
        }

        // Changement de forme (périgée pour efficacité)
        if (Math.abs(targetOrbit.semiMajorAxis - initialOrbit.semiMajorAxis) > 1e-3 ||
            Math.abs(targetOrbit.eccentricity - initialOrbit.eccentricity) > 1e-6) {

            const perigeeAnomaly = 0; // Périgée
            const r_p = initialOrbit.semiMajorAxis * (1 - initialOrbit.eccentricity);

            const v1 = Math.sqrt(mu * (2 / r_p - 1 / initialOrbit.semiMajorAxis));
            const v2 = Math.sqrt(mu * (2 / r_p - 1 / targetOrbit.semiMajorAxis));

            const deltaV = Math.abs(v2 - v1);

            maneuvers.push({
                deltaV: new THREE.Vector3(deltaV, 0, 0),
                trueAnomaly: perigeeAnomaly,
                deltaVMagnitude: deltaV
            });
        }

        const totalDeltaV = maneuvers.reduce((sum, m) => sum + m.deltaVMagnitude, 0);

        return {
            maneuvers,
            totalDeltaV,
            feasible: maneuvers.length <= maxImpulses
        };
    }

    /**
     * Calcule un transfert inter-planétaire (patched conics)
     */
    public static interplanetaryTransfer(
        departureOrbit: OrbitalElements,
        arrivalOrbit: OrbitalElements,
        departurePlanetMu: number,
        arrivalPlanetMu: number,
        sunMu: number = 1.327e11, // km³/s²
        transferTime: number
    ): {
        departureV_infinity: number;
        arrivalV_infinity: number;
        departureDeltaV: number;
        arrivalDeltaV: number;
        totalDeltaV: number;
    } {
        // Vitesses circulaires aux orbites de parking
        const v_circular_dep = Math.sqrt(departurePlanetMu / departureOrbit.semiMajorAxis);
        const v_circular_arr = Math.sqrt(arrivalPlanetMu / arrivalOrbit.semiMajorAxis);

        // Vitesses d'évasion hyperboliques (approximation)
        const v_infinity_dep = 3000; // m/s (valeur typique)
        const v_infinity_arr = 2000; // m/s (valeur typique)

        // Delta-V pour s'échapper de l'orbite de parking
        const v_hyperbolic_dep = Math.sqrt(v_infinity_dep * v_infinity_dep + 2 * departurePlanetMu / departureOrbit.semiMajorAxis);
        const departureDeltaV = v_hyperbolic_dep - v_circular_dep;

        // Delta-V pour capture à l'arrivée
        const v_hyperbolic_arr = Math.sqrt(v_infinity_arr * v_infinity_arr + 2 * arrivalPlanetMu / arrivalOrbit.semiMajorAxis);
        const arrivalDeltaV = v_hyperbolic_arr - v_circular_arr;

        return {
            departureV_infinity: v_infinity_dep,
            arrivalV_infinity: v_infinity_arr,
            departureDeltaV,
            arrivalDeltaV,
            totalDeltaV: departureDeltaV + arrivalDeltaV
        };
    }

    /**
     * Optimise le timing d'une fenêtre de lancement
     */
    public static launchWindowOptimization(
        targetOrbit: OrbitalElements,
        launchSite: { latitude: number; longitude: number },
        timeWindow: number = 86400, // 24h
        mu: number = 398600.4418
    ): Array<{
        launchTime: number;
        azimuth: number;
        deltaV: number;
        inclination: number;
    }> {
        const opportunities: Array<{
            launchTime: number;
            azimuth: number;
            deltaV: number;
            inclination: number;
        }> = [];

        const earthRotationRate = 7.2921159e-5; // rad/s
        const dt = 600; // Échantillonnage toutes les 10 minutes

        for (let t = 0; t < timeWindow; t += dt) {
            // Position du site de lancement à l'instant t
            const longitude = launchSite.longitude + earthRotationRate * t;

            // Calcul de l'azimuth optimal
            const beta = Math.asin(Math.cos(targetOrbit.inclination) / Math.cos(launchSite.latitude));
            const azimuth = Math.atan2(Math.sin(beta), Math.tan(targetOrbit.inclination) / Math.sin(launchSite.latitude));

            // Vitesse de lancement requise
            const v_orbit = Math.sqrt(mu / targetOrbit.semiMajorAxis);
            const v_earth = 465.1 * Math.cos(launchSite.latitude); // m/s rotation terrestre
            const deltaV = Math.sqrt(v_orbit * v_orbit + v_earth * v_earth - 2 * v_orbit * v_earth * Math.cos(azimuth));

            opportunities.push({
                launchTime: t,
                azimuth: azimuth * 180 / Math.PI,
                deltaV,
                inclination: targetOrbit.inclination * 180 / Math.PI
            });
        }

        // Trier par delta-V croissant
        return opportunities.sort((a, b) => a.deltaV - b.deltaV);
    }

    /**
     * Fonctions utilitaires privées
     */
    private static stateToElements(state: StateVector, mu: number): OrbitalElements {
        const r = state.position.length();
        const v = state.velocity.length();

        const energy = (v * v) / 2 - mu / r;
        const a = -mu / (2 * energy);

        const h = new THREE.Vector3().crossVectors(state.position, state.velocity);
        const hMag = h.length();

        const eVector = new THREE.Vector3()
            .crossVectors(state.velocity, h)
            .divideScalar(mu)
            .sub(state.position.clone().normalize());
        const e = eVector.length();

        const i = Math.acos(h.z / hMag);
        const Omega = Math.atan2(h.x, -h.y);
        const omega = Math.atan2(eVector.z / Math.sin(i), (eVector.x * Math.cos(Omega) + eVector.y * Math.sin(Omega)));

        const cosNu = state.position.dot(eVector) / (r * e);
        const nu = Math.acos(Math.max(-1, Math.min(1, cosNu)));

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

    private static elementsToPosition(elements: OrbitalElements, mu: number): THREE.Vector3 {
        const { semiMajorAxis: a, eccentricity: e, trueAnomaly: nu } = elements;
        const r = a * (1 - e * e) / (1 + e * Math.cos(nu));

        return new THREE.Vector3(
            r * Math.cos(nu),
            r * Math.sin(nu),
            0
        );
    }
}