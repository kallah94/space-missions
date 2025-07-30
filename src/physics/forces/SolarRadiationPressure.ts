import * as THREE from 'three';
import { Force } from './Force';
import { SolarRadiationConfig } from '../../types';

/**
 * Force de pression de radiation solaire
 */
export class SolarRadiationPressure extends Force {
    private config: SolarRadiationConfig;
    private solarConstant: number = 1367; // W/m², constante solaire
    private lightSpeed: number = 299792458; // m/s

    constructor(config: SolarRadiationConfig) {
        super('Solar Radiation Pressure');
        this.config = config;
    }

    /**
     * Calcule l'accélération due à la pression de radiation
     */
    public calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        mass: number,
        time: number
    ): THREE.Vector3 {
        // Position du Soleil (simplifiée)
        const sunPosition = this.getSunPosition(time);
        const sunDirection = sunPosition.clone().sub(position).normalize();

        // Vérifier si le satellite est dans l'ombre de la Terre
        const shadowFactor = this.config.shadowFunction ?
            this.config.shadowFunction(position, sunPosition) :
            this.calculateShadowFactor(position, sunPosition);

        if (shadowFactor === 0) {
            return new THREE.Vector3(0, 0, 0);
        }

        // Distance au Soleil
        const sunDistance = position.distanceTo(sunPosition);
        const earthSunDistance = 149597870.7; // km, 1 AU

        // Flux solaire à cette distance
        const solarFlux = this.solarConstant * ((earthSunDistance / sunDistance) ** 2);

        // Pression de radiation
        const pressure = solarFlux / this.lightSpeed; // Pa

        // Force par unité de surface
        const forcePerArea = pressure * (1 + this.config.cr); // Absorption + réflexion

        // Force totale
        const totalForce = forcePerArea * this.config.area * shadowFactor;

        // Accélération
        return sunDirection.multiplyScalar(totalForce / this.config.mass);
    }

    /**
     * Calcule le facteur d'ombre (0 = ombre complète, 1 = plein soleil)
     */
    private calculateShadowFactor(
        satellitePos: THREE.Vector3,
        sunPos: THREE.Vector3
    ): number {
        const earthRadius = 6378.137; // km

        // Vecteur du satellite vers le Soleil
        const satToSun = sunPos.clone().sub(satellitePos);
        const satToSunMag = satToSun.length();

        // Projection du satellite sur la ligne Terre-Soleil
        const satProjection = satellitePos.dot(satToSun) / satToSunMag;

        // Si le satellite est du côté jour, pas d'ombre
        if (satProjection <= 0) {
            return 1.0;
        }

        // Distance perpendiculaire à la ligne Terre-Soleil
        const perpDistance = Math.sqrt(
            satellitePos.lengthSq() - satProjection ** 2
        );

        // Le satellite est dans l'ombre si la distance perpendiculaire < rayon terrestre
        if (perpDistance < earthRadius) {
            // Ombre complète (ombra)
            return 0.0;
        }

        // TODO: Calculer la pénombre pour plus de réalisme
        return 1.0;
    }

    /**
     * Position simplifiée du Soleil
     */
    private getSunPosition(time: number): THREE.Vector3 {
        const earthPeriod = 365.25 * 24 * 3600; // secondes
        const earthDistance = 149597870.7; // km
        const angle = (2 * Math.PI * time) / earthPeriod;

        return new THREE.Vector3(
            earthDistance * Math.cos(angle),
            earthDistance * Math.sin(angle),
            0
        );
    }

    /**
     * Vérifie si la pression de radiation est significative
     */
    public override isApplicable(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        time: number
    ): boolean {
        if (!this.enabled) return false;

        // Toujours applicable dans l'espace, mais plus significative
        // pour les satellites légers avec grande surface
        const areaToMassRatio = this.config.area / this.config.mass;
        return areaToMassRatio > 0.001; // m²/kg
    }

    /**
     * Met à jour les paramètres de radiation
     */
    public updateRadiationParameters(cr: number, area: number, mass: number): void {
        this.config.cr = cr;
        this.config.area = area;
        this.config.mass = mass;
    }
}
