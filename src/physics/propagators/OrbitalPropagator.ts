import * as THREE from 'three'
import {OrbitalElements, StateVector} from "../../types";


/**
 * Interface de base pour tous les propagateurs orbitaux
 */
export abstract class OrbitalPropagator {
    protected mu: number // Paramètre gravitationnel du corps central (en m^3/s^2)
    protected epoch: Date // Epoque de référence pour la propagation

    constructor(mu: number = 398600.4418, epoch: Date = new Date()) {
        this.mu = mu // Valeur par défaut pour la Terre
        this.epoch = epoch
    }

    /**
     * Propage un vecteur d'état (position et vitesse) dans le temps
     */
    abstract propagate(
        initialState: StateVector,
        timeStep: number,
        duration: number,
    ): StateVector[]

    /**
     * Propage un seul pas de temps
     */
    abstract propagateStep(
        initialState: StateVector,
        deltaTime: number,
    ): StateVector

    /**
     * Calcule de l'accélération à partir d'un vecteur d'état
     */
    abstract calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        time: number
    ) : THREE.Vector3

    /**
     * Convertit les éléments orbitaux en un vecteur d'état
     */
    protected elementsToStateVector(elements: OrbitalElements): StateVector {
        const {
            semiMajorAxis: a,
            eccentricity: e,
            inclination: i,
            longitudeOfAscendingNode: omega,
            argumentOfPeriapsis: w,
            trueAnomaly: nu
        } = elements;

        // Distance Orbitale
        const r = a * (1 - e * e) / (1 + e * Math.cos(nu));

        // Position dans le plan orbital
        const x_orb = r * Math.cos(nu);
        const y_orb = r * Math.sin(nu);

        // Vitesse dans le plan orbitale
        const p = a * (1 - e * e);
        const h = Math.sqrt(this.mu * p);
        const vx_orb = -(this.mu / h) * Math.sin(nu);
        const vy_orb = (this.mu / h) * (e + Math.cos(nu));

        // Matrices de rotation
        const cosOmega = Math.cos(omega)
        const sinOmega = Math.sin(omega)
        const cosI = Math.cos(i)
        const sinI = Math.sin(i)
        const cosW = Math.cos(w)
        const sinW = Math.sin(w)

        // Transformation vers référentiel inertiel
        const position = new THREE.Vector3(
            x_orb * (cosOmega * cosW - sinOmega * sinW * cosI) - y_orb * (cosOmega * sinW + sinOmega * cosW * cosI),
            x_orb * (sinOmega * cosW + cosOmega * sinW * cosI) - y_orb * (sinOmega * sinW - cosOmega * cosW * cosI),
            x_orb * (sinW * sinI) + y_orb * (cosW * sinI)
        );

        const velocity = new THREE.Vector3(
            vx_orb * (cosOmega * cosW - sinOmega * sinW * cosI) - vy_orb * (cosOmega * sinW + sinOmega * cosW * cosI),
            vx_orb * (sinOmega * cosW + cosOmega * sinW * cosI) - vy_orb * (sinOmega * sinW - cosOmega * cosW * cosI),
            vx_orb * (sinW * sinI) + vy_orb * (cosW * sinI)
        );

        return {
            position,
            velocity,
            time: 0
        }
    }

    /**
     * Calcule les éléments orbitaux à partir d'un vecteur d'état
     */
    protected stateVectorToElements(state: StateVector): OrbitalElements {
        const { position: r, velocity: v } = state;
        const rMag = r.length();
        const vMag = v.length();

        // Vecteur moment angulaire
        const h = new THREE.Vector3().crossVectors(r, v);
        const hMag = h.length();

        // Vecteur excentricité
        const eVector = new THREE.Vector3()
            .crossVectors(v, h)
            .divideScalar(this.mu)
            .sub(r.clone().normalize());

        const eccentricity = eVector.length();

        // Énergie spécifique
        const energy = (vMag * vMag) / 2 - this.mu / rMag;
        const semiMajorAxis = -this.mu / (2 * energy);

        // Inclinaison
        const inclination = Math.acos(h.z / hMag);

        // Vecteur nœud
        const nVector = new THREE.Vector3(-h.y, h.x, 0);
        const nMag = nVector.length();

        // Longitude du nœud ascendant
        let longitudeOfAscendingNode = 0
        if ( nMag > 1e-10 ) {
            longitudeOfAscendingNode = Math.acos(nVector.x / nMag);
            if ( nVector.y < 0) {
                longitudeOfAscendingNode = 2 * Math.PI - longitudeOfAscendingNode;
            }
        }

        let argumentOfPeriapsis = 0;
        if (nMag > 1e-10 && eccentricity > 1e-10) {
            argumentOfPeriapsis = Math.acos(nVector.dot(eVector) / (nMag * eccentricity));
            if (eVector.z < 0) {
                argumentOfPeriapsis = 2 * Math.PI - argumentOfPeriapsis;
            }
        }

        // Anomalie vraie
        let trueAnomaly = 0;
        if (eccentricity > 1e-10) {
            trueAnomaly = Math.acos(eVector.dot(r) / (eccentricity * rMag));
            if (r.dot(v) < 0) {
                trueAnomaly = 2 * Math.PI - trueAnomaly;
            }
        }

        return {
            semiMajorAxis,
            eccentricity,
            inclination,
            longitudeOfAscendingNode,
            argumentOfPeriapsis,
            trueAnomaly,
            epoch: this.epoch
        };

    }
}