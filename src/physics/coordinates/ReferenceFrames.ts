import * as THREE from 'three';
import { ReferenceFrame, StateVector } from '../../types';

/**
 * Gestionnaire des systèmes de référence orbitaux
 */
export class ReferenceFrames {
    /**
     * Calcule la matrice de transformation vers le référentiel LVLH
     */
    public static getLVLHTransform(state: StateVector): THREE.Matrix4 {
        const r = state.position.clone().normalize(); // Radial
        const h = new THREE.Vector3().crossVectors(state.position, state.velocity).normalize(); // Normal
        const t = new THREE.Vector3().crossVectors(h, r); // Along-track

        const matrix = new THREE.Matrix4();
        matrix.set(
            r.x, t.x, h.x, 0,
            r.y, t.y, h.y, 0,
            r.z, t.z, h.z, 0,
            0, 0, 0, 1
        );

        return matrix;
    }

    /**
     * Calcule la matrice de transformation vers le référentiel RSW
     */
    public static getRSWTransform(state: StateVector): THREE.Matrix4 {
        const r = state.position.clone().normalize(); // Radial
        const w = new THREE.Vector3().crossVectors(state.position, state.velocity).normalize(); // Cross-track
        const s = new THREE.Vector3().crossVectors(w, r); // Along-track

        const matrix = new THREE.Matrix4();
        matrix.set(
            r.x, s.x, w.x, 0,
            r.y, s.y, w.y, 0,
            r.z, s.z, w.z, 0,
            0, 0, 0, 1
        );

        return matrix;
    }

    /**
     * Transforme vers le référentiel TEME (True Equator Mean Equinox)
     */
    public static getTemeTransform(time: number): THREE.Matrix4 {
        // Simplification - transformation identique à ECI pour cette implémentation
        // En réalité, TEME inclut la précession et nutation
        return new THREE.Matrix4().identity();
    }

    /**
     * Transforme vers EME2000 (J2000.0)
     */
    public static getEME2000Transform(time: number): THREE.Matrix4 {
        // Matrice de précession simplifiée
        const T = time / (365.25 * 24 * 3600 * 100); // Siècles juliens depuis J2000

        // Angles de précession (Lieske et al. 1977)
        const zeta = (2306.2181 + 1.39656 * T - 0.000139 * T * T) * T * Math.PI / (180 * 3600);
        const z = (2306.2181 + 1.09468 * T + 0.000066 * T * T) * T * Math.PI / (180 * 3600);
        const theta = (2004.3109 - 0.85330 * T - 0.000217 * T * T) * T * Math.PI / (180 * 3600);

        // Matrices de rotation
        const Rz1 = new THREE.Matrix4().makeRotationZ(-zeta);
        const Ry = new THREE.Matrix4().makeRotationY(theta);
        const Rz2 = new THREE.Matrix4().makeRotationZ(-z);

        return Rz2.multiply(Ry).multiply(Rz1);
    }

    /**
     * Vérifie si un référentiel est inertiel
     */
    public static isInertialFrame(frame: ReferenceFrame): boolean {
        return ['ECI', 'EME2000', 'TEME'].includes(frame);
    }

    /**
     * Vérifie si un référentiel est fixe à la Terre
     */
    public static isEarthFixedFrame(frame: ReferenceFrame): boolean {
        return ['ECEF', 'ENU'].includes(frame);
    }

    /**
     * Vérifie si un référentiel est local orbital
     */
    public static isOrbitalFrame(frame: ReferenceFrame): boolean {
        return ['LVLH', 'RSW'].includes(frame);
    }

    /**
     * Obtient les axes caractéristiques d'un référentiel orbital
     */
    public static getOrbitalAxes(state: StateVector, frame: ReferenceFrame): {
        x: THREE.Vector3;
        y: THREE.Vector3;
        z: THREE.Vector3;
    } {
        switch (frame) {
            case 'LVLH': {
                const r = state.position.clone().normalize();
                const h = new THREE.Vector3().crossVectors(state.position, state.velocity).normalize();
                const t = new THREE.Vector3().crossVectors(h, r);
                return { x: r, y: t, z: h };
            }
            case 'RSW': {
                const r = state.position.clone().normalize();
                const w = new THREE.Vector3().crossVectors(state.position, state.velocity).normalize();
                const s = new THREE.Vector3().crossVectors(w, r);
                return { x: r, y: s, z: w };
            }
            default:
                return {
                    x: new THREE.Vector3(1, 0, 0),
                    y: new THREE.Vector3(0, 1, 0),
                    z: new THREE.Vector3(0, 0, 1)
                };
        }
    }

    /**
     * Calcule la dérivée temporelle d'un référentiel orbital
     */
    public static getFrameRateMatrix(state: StateVector, frame: ReferenceFrame): THREE.Matrix3 {
        if (!this.isOrbitalFrame(frame)) {
            return new THREE.Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0);
        }

        const r = state.position.length();
        const n = Math.sqrt(398600.4418 / (r * r * r)); // Mouvement moyen orbital approximatif

        // Matrice de rotation pour LVLH/RSW
        const omega = new THREE.Matrix3().set(
            0, 0, 0,
            0, 0, n,
            0, -n, 0
        );

        return omega;
    }
}