import * as THREE from 'three';
import { Force } from './Force';
import { AtmosphericDragConfig, AtmosphereModel } from '../../types';

/**
 * Force de traînée atmosphérique
 */
export class AtmosphericDrag extends Force {
    private config: AtmosphericDragConfig;
    private atmosphereModel: AtmosphereModel;

    constructor(config: AtmosphericDragConfig, atmosphereModel?: AtmosphereModel) {
        super('Atmospheric Drag');
        this.config = config;
        this.atmosphereModel = atmosphereModel || new ExponentialAtmosphere();
    }

    /**
     * Calcule l'accélération due à la traînée
     */
    public calculateAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        mass: number,
        time: number
    ): THREE.Vector3 {
        const altitude = position.length() - 6378.137; // Altitude au-dessus de la Terre

        if (altitude > 1000) {
            // Pas de traînée significative au-dessus de 1000 km
            return new THREE.Vector3(0, 0, 0);
        }

        // Densité atmosphérique à cette altitude
        const density = this.atmosphereModel.getDensity(altitude);

        if (density <= 0) {
            return new THREE.Vector3(0, 0, 0);
        }

        // Vitesse relative à l'atmosphère (en rotation avec la Terre)
        const atmosphericVelocity = this.calculateAtmosphericVelocity(position);
        const relativeVelocity = velocity.clone().sub(atmosphericVelocity);
        const relativeSpeed = relativeVelocity.length();

        if (relativeSpeed === 0) {
            return new THREE.Vector3(0, 0, 0);
        }

        // Force de traînée: F = -0.5 * ρ * Cd * A * v² * v̂
        const dragMagnitude = 0.5 * density * this.config.cd * this.config.area * relativeSpeed ** 2;
        const dragDirection = relativeVelocity.clone().normalize().multiplyScalar(-1);

        // Accélération: a = F/m
        return dragDirection.multiplyScalar(dragMagnitude / this.config.mass);
    }

    /**
     * Calcule la vitesse de l'atmosphère en rotation
     */
    private calculateAtmosphericVelocity(position: THREE.Vector3): THREE.Vector3 {
        const earthRotationRate = 7.2921159e-5; // rad/s

        // Vitesse due à la rotation terrestre: ω × r
        const omega = new THREE.Vector3(0, 0, earthRotationRate);
        return new THREE.Vector3().crossVectors(omega, position);
    }

    /**
     * Vérifie si la traînée est applicable
     */
    public override isApplicable(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        time: number
    ): boolean {
        if (!this.enabled) return false;

        const altitude = position.length() - 6378.137;
        return altitude < 1000; // Traînée significative seulement en dessous de 1000 km
    }

    /**
     * Met à jour les paramètres de traînée
     */
    public updateDragParameters(cd: number, area: number, mass: number): void {
        this.config.cd = cd;
        this.config.area = area;
        this.config.mass = mass;
    }
}

/**
 * Modèle atmosphérique exponentiel simple
 */
class ExponentialAtmosphere implements AtmosphereModel {
    getDensity(altitude: number): number {
        // Modèle exponentiel simple
        const h0 = 8.5; // km, hauteur d'échelle
        const rho0 = 1.225; // kg/m³, densité au niveau de la mer

        if (altitude < 0) return rho0;
        return rho0 * Math.exp(-altitude / h0);
    }

    getTemperature(altitude: number): number {
        // Température standard ISA
        if (altitude < 11) {
            return 288.15 - 6.5 * altitude; // K
        }
        return 216.65; // K, stratosphère
    }

    getPressure(altitude: number): number {
        const temp = this.getTemperature(altitude);
        const density = this.getDensity(altitude);
        const R = 287.04; // J/(kg·K), constante des gaz pour l'air
        return density * R * temp;
    }
}
