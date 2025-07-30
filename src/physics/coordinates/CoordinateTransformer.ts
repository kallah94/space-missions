import * as THREE from 'three';
import { ReferenceFrame, CoordinateTransform, GeographicCoordinates, SphericalCoordinates } from '../../types';

/**
 * Transforme les coordonnées entre différents systèmes de référence
 */
export class CoordinateTransformer {
    private static readonly EARTH_RADIUS = 6378137.0; // WGS84 équatorial (m)
    private static readonly EARTH_FLATTENING = 1 / 298.257223563; // WGS84
    private static readonly EARTH_ECCENTRICITY_SQ = 2 * this.EARTH_FLATTENING - this.EARTH_FLATTENING * this.EARTH_FLATTENING;

    /**
     * Transforme un vecteur position d'un système à un autre
     */
    public static transform(
        position: THREE.Vector3,
        from: ReferenceFrame,
        to: ReferenceFrame,
        time: number = 0
    ): THREE.Vector3 {
        if (from === to) return position.clone();

        // Matrice de transformation
        const matrix = this.getTransformMatrix(from, to, time);
        return position.clone().applyMatrix4(matrix);
    }

    /**
     * Obtient la matrice de transformation entre deux systèmes
     */
    public static getTransformMatrix(
        from: ReferenceFrame,
        to: ReferenceFrame,
        time: number = 0
    ): THREE.Matrix4 {
        const transform: CoordinateTransform = {
            from,
            to,
            time,
            matrix: new THREE.Matrix4()
        };

        // Routes de transformation directes
        switch (`${from}_to_${to}`) {
            case 'ECI_to_ECEF':
                return this.eciToEcef(time);
            case 'ECEF_to_ECI':
                return this.ecefToEci(time);
            case 'ECEF_to_ENU':
                // Nécessite position de référence - utiliser origine par défaut
                return this.ecefToEnu(new THREE.Vector3(0, 0, 0));
            case 'ENU_to_ECEF':
                return this.enuToEcef(new THREE.Vector3(0, 0, 0));
            default:
                // Transformation via ECI si nécessaire
                if (from !== 'ECI' && to !== 'ECI') {
                    const toEci = this.getTransformMatrix(from, 'ECI', time);
                    const fromEci = this.getTransformMatrix('ECI', to, time);
                    return fromEci.multiply(toEci);
                }
                return new THREE.Matrix4(); // Identité par défaut
        }
    }

    /**
     * Conversion ECI vers ECEF (rotation de la Terre)
     */
    private static eciToEcef(time: number): THREE.Matrix4 {
        const gmst = this.calculateGMST(time);
        return new THREE.Matrix4().makeRotationZ(-gmst);
    }

    /**
     * Conversion ECEF vers ECI
     */
    private static ecefToEci(time: number): THREE.Matrix4 {
        const gmst = this.calculateGMST(time);
        return new THREE.Matrix4().makeRotationZ(gmst);
    }

    /**
     * Conversion ECEF vers ENU local
     */
    private static ecefToEnu(referencePosition: THREE.Vector3): THREE.Matrix4 {
        const geo = this.ecefToGeodetic(referencePosition);
        const lat = geo.latitude;
        const lon = geo.longitude;

        const matrix = new THREE.Matrix4();
        matrix.set(
            -Math.sin(lon), Math.cos(lon), 0, 0,
            -Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat), 0,
            Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat), 0,
            0, 0, 0, 1
        );

        return matrix;
    }

    /**
     * Conversion ENU vers ECEF
     */
    private static enuToEcef(referencePosition: THREE.Vector3): THREE.Matrix4 {
        return this.ecefToEnu(referencePosition).invert();
    }

    /**
     * Calcule le temps sidéral moyen de Greenwich (GMST)
     */
    private static calculateGMST(time: number): number {
        // Simplification - calcul approximatif du GMST
        const secondsPerDay = 86400;
        const secondsPerSiderealDay = 86164.09054;
        const earthRotationRate = (2 * Math.PI) / secondsPerSiderealDay;

        return (earthRotationRate * time) % (2 * Math.PI);
    }

    /**
     * Conversion coordonnées cartésiennes ECEF vers géodétiques
     */
    public static ecefToGeodetic(position: THREE.Vector3): GeographicCoordinates {
        const x = position.x;
        const y = position.y;
        const z = position.z;

        const a = this.EARTH_RADIUS;
        const e2 = this.EARTH_ECCENTRICITY_SQ;

        const p = Math.sqrt(x * x + y * y);
        let lat = Math.atan2(z, p * (1 - e2));

        // Itération pour la latitude
        for (let i = 0; i < 5; i++) {
            const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
            const h = p / Math.cos(lat) - N;
            lat = Math.atan2(z, p * (1 - e2 * N / (N + h)));
        }

        const lon = Math.atan2(y, x);
        const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
        const alt = (p / Math.cos(lat) - N) / 1000; // km

        return { latitude: lat, longitude: lon, altitude: alt };
    }

    /**
     * Conversion coordonnées géodétiques vers ECEF
     */
    public static geodeticToEcef(geo: GeographicCoordinates): THREE.Vector3 {
        const lat = geo.latitude;
        const lon = geo.longitude;
        const h = geo.altitude * 1000; // m

        const a = this.EARTH_RADIUS;
        const e2 = this.EARTH_ECCENTRICITY_SQ;
        const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));

        const x = (N + h) * Math.cos(lat) * Math.cos(lon);
        const y = (N + h) * Math.cos(lat) * Math.sin(lon);
        const z = (N * (1 - e2) + h) * Math.sin(lat);

        return new THREE.Vector3(x, y, z);
    }

    /**
     * Conversion cartésiennes vers sphériques
     */
    public static cartesianToSpherical(position: THREE.Vector3): SphericalCoordinates {
        const radius = position.length();
        const azimuth = Math.atan2(position.y, position.x);
        const elevation = Math.asin(position.z / radius);

        return { radius, azimuth, elevation };
    }

    /**
     * Conversion sphériques vers cartésiennes
     */
    public static sphericalToCartesian(spherical: SphericalCoordinates): THREE.Vector3 {
        const { radius, azimuth, elevation } = spherical;

        const x = radius * Math.cos(elevation) * Math.cos(azimuth);
        const y = radius * Math.cos(elevation) * Math.sin(azimuth);
        const z = radius * Math.sin(elevation);

        return new THREE.Vector3(x, y, z);
    }
}