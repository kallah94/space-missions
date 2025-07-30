import * as THREE from 'three';
import { GeographicCoordinates, SphericalCoordinates } from '../../types';

/**
 * Utilitaires pour manipulations de coordonnées
 */
export class CoordinateUtils {
    /**
     * Constantes géodésiques WGS84
     */
    public static readonly WGS84 = {
        a: 6378137.0,           // Demi-grand axe (m)
        f: 1 / 298.257223563,   // Aplatissement
        e2: 0.00669437999014,   // Première excentricité au carré
        e2p: 0.00673949674228   // Seconde excentricité au carré
    };

    /**
     * Constantes temporelles
     */
    public static readonly TIME = {
        JD_J2000: 2451545.0,           // Jour julien J2000.0
        SECONDS_PER_DAY: 86400.0,      // Secondes par jour
        SIDEREAL_DAY: 86164.09054,     // Jour sidéral en secondes
        TROPICAL_YEAR: 365.24219,      // Année tropique en jours
        EARTH_ROTATION_RATE: 7.2921159e-5 // rad/s
    };

    /**
     * Calcule la distance entre deux points géographiques (Haversine)
     */
    public static haversineDistance(
        coord1: GeographicCoordinates,
        coord2: GeographicCoordinates
    ): number {
        const R = 6371; // Rayon terrestre en km
        const dLat = coord2.latitude - coord1.latitude;
        const dLon = coord2.longitude - coord1.longitude;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coord1.latitude) * Math.cos(coord2.latitude) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * Calcule l'azimut et l'élévation d'un satellite depuis un observateur
     */
    public static calculateAzimuthElevation(
        observerPosition: THREE.Vector3,
        satellitePosition: THREE.Vector3
    ): { azimuth: number; elevation: number; range: number } {
        const relativePosition = satellitePosition.clone().sub(observerPosition);
        const range = relativePosition.length();

        // Conversion vers coordonnées sphériques locales
        const spherical = new THREE.Spherical().setFromVector3(relativePosition);

        // Azimut (0° = Nord, 90° = Est)
        let azimuth = spherical.theta - Math.PI / 2;
        if (azimuth < 0) azimuth += 2 * Math.PI;

        // Élévation
        const elevation = Math.PI / 2 - spherical.phi;

        return {
            azimuth: azimuth * 180 / Math.PI,
            elevation: elevation * 180 / Math.PI,
            range: range / 1000 // km
        };
    }

    /**
     * Vérifie si un satellite est visible depuis un point d'observation
     */
    public static isVisible(
        observerGeo: GeographicCoordinates,
        satellitePosition: THREE.Vector3,
        minElevation: number = 5
    ): boolean {
        // Position de l'observateur en ECEF
        const observerEcef = this.geodeticToEcef(observerGeo);

        // Calcul azimut/élévation
        const { elevation } = this.calculateAzimuthElevation(observerEcef, satellitePosition);

        return elevation >= minElevation;
    }

    /**
     * Conversion géodétique vers ECEF
     */
    public static geodeticToEcef(geo: GeographicCoordinates): THREE.Vector3 {
        const { a, e2 } = this.WGS84;
        const lat = geo.latitude;
        const lon = geo.longitude;
        const h = geo.altitude * 1000; // m

        const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));

        const x = (N + h) * Math.cos(lat) * Math.cos(lon);
        const y = (N + h) * Math.cos(lat) * Math.sin(lon);
        const z = (N * (1 - e2) + h) * Math.sin(lat);

        return new THREE.Vector3(x, y, z);
    }

    /**
     * Conversion ECEF vers géodétique (algorithme de Bowring)
     */
    public static ecefToGeodetic(position: THREE.Vector3): GeographicCoordinates {
        const { a, f, e2, e2p } = this.WGS84;
        const x = position.x;
        const y = position.y;
        const z = position.z;

        const p = Math.sqrt(x * x + y * y);
        const tanu = (z / p) * (a / (a * Math.sqrt(1 - e2)));
        const u = Math.atan(tanu);

        const latitude = Math.atan2(
            z + e2p * (a * (1 - f)) * Math.pow(Math.sin(u), 3),
            p - e2 * a * Math.pow(Math.cos(u), 3)
        );

        const longitude = Math.atan2(y, x);

        const N = a / Math.sqrt(1 - e2 * Math.sin(latitude) * Math.sin(latitude));
        const altitude = (p / Math.cos(latitude) - N) / 1000; // km

        return { latitude, longitude, altitude };
    }

    /**
     * Normalise un angle en radians dans l'intervalle [0, 2π]
     */
    public static normalizeAngle(angle: number): number {
        while (angle < 0) angle += 2 * Math.PI;
        while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
        return angle;
    }

    /**
     * Normalise un angle en radians dans l'intervalle [-π, π]
     */
    public static normalizeAnglePi(angle: number): number {
        while (angle < -Math.PI) angle += 2 * Math.PI;
        while (angle >= Math.PI) angle -= 2 * Math.PI;
        return angle;
    }

    /**
     * Convertit degrés vers radians
     */
    public static deg2rad(degrees: number): number {
        return degrees * Math.PI / 180;
    }

    /**
     * Convertit radians vers degrés
     */
    public static rad2deg(radians: number): number {
        return radians * 180 / Math.PI;
    }

    /**
     * Calcule la sous-trace d'un satellite (point nadir)
     */
    public static calculateSubsatellitePoint(position: THREE.Vector3, time: number): GeographicCoordinates {
        // Conversion ECEF vers géodétique avec correction de rotation terrestre
        const gmst = this.calculateGMST(time);
        const rotatedPosition = position.clone().applyMatrix4(
            new THREE.Matrix4().makeRotationZ(-gmst)
        );

        return this.ecefToGeodetic(rotatedPosition);
    }

    /**
     * Calcule le temps sidéral moyen de Greenwich
     */
    public static calculateGMST(time: number): number {
        const T = time / (this.TIME.SECONDS_PER_DAY * 36525); // Siècles juliens

        // Formule IAU 1982
        let gmst = 24110.54841 + 8640184.812866 * T + 0.093104 * T * T - 0.0000062 * T * T * T;
        gmst = (gmst % this.TIME.SECONDS_PER_DAY) / this.TIME.SECONDS_PER_DAY * 2 * Math.PI;

        return this.normalizeAngle(gmst);
    }

    /**
     * Calcule les heures de lever/coucher d'un satellite
     */
    public static calculatePassTimes(
        observerGeo: GeographicCoordinates,
        satelliteStates: Array<{ time: number; position: THREE.Vector3 }>,
        minElevation: number = 5
    ): Array<{ aos: number; los: number; maxElevation: number; maxElevationTime: number }> {
        const passes: Array<{ aos: number; los: number; maxElevation: number; maxElevationTime: number }> = [];
        let inPass = false;
        let currentPass: any = null;

        for (const state of satelliteStates) {
            const isVis = this.isVisible(observerGeo, state.position, minElevation);
            const { elevation } = this.calculateAzimuthElevation(
                this.geodeticToEcef(observerGeo),
                state.position
            );

            if (isVis && !inPass) {
                // Début de passage
                inPass = true;
                currentPass = {
                    aos: state.time,
                    los: 0,
                    maxElevation: elevation,
                    maxElevationTime: state.time
                };
            } else if (isVis && inPass) {
                // Continuation du passage
                if (elevation > currentPass.maxElevation) {
                    currentPass.maxElevation = elevation;
                    currentPass.maxElevationTime = state.time;
                }
            } else if (!isVis && inPass) {
                // Fin de passage
                inPass = false;
                currentPass.los = state.time;
                passes.push(currentPass);
                currentPass = null;
            }
        }

        return passes;
    }
}