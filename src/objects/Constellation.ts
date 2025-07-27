import * as THREE from 'three';
import { ConstellationConfig, OrbitalShellConfig, SpacecraftConfig } from '../types';
import { Spacecraft } from './Spacecraft';

/**
 * Classe pour gérer une constellation de satellites
 */
export class Constellation {
    public readonly name: string;
    public readonly satellites: Spacecraft[] = [];
    public readonly orbitalShells: OrbitalShellConfig[];

    private satelliteTemplate: SpacecraftConfig;
    private group: THREE.Group;

    constructor(config: ConstellationConfig) {
        this.name = config.name;
        this.orbitalShells = config.orbitalShells;
        this.satelliteTemplate = config.satellite;
        this.group = new THREE.Group();

        this.generateConstellation();
    }

    /**
     * Génère tous les satellites de la constellation
     */
    private generateConstellation(): void {
        let satelliteIndex = 0;

        for (const shell of this.orbitalShells) {
            this.generateOrbitalShell(shell, satelliteIndex);
            satelliteIndex += shell.satellites;
        }
    }

    /**
     * Génère une couche orbitale de satellites
     */
    private generateOrbitalShell(shell: OrbitalShellConfig, startIndex: number): void {
        const earthRadius = 6371; // km
        const altitude = shell.altitude;
        const orbitalRadius = earthRadius + altitude;

        // Vitesse orbitale circulaire
        const mu = 398600.4418; // km³/s²
        const orbitalVelocity = Math.sqrt(mu / orbitalRadius);

        for (let plane = 0; plane < shell.planes; plane++) {
            // RAAN (Right Ascension of Ascending Node) pour chaque plan
            const raan = (plane * 2 * Math.PI) / shell.planes;

            for (let satInPlane = 0; satInPlane < shell.satellitesPerPlane; satInPlane++) {
                // Anomalie vraie pour distribuer les satellites dans le plan
                const trueAnomaly = (satInPlane * 2 * Math.PI) / shell.satellitesPerPlane;

                // Calcul de la position en coordonnées orbitales
                const position = this.calculateOrbitalPosition(
                    orbitalRadius,
                    shell.inclination * Math.PI / 180, // Conversion en radians
                    raan,
                    trueAnomaly
                );

                // Calcul de la vitesse en coordonnées orbitales
                const velocity = this.calculateOrbitalVelocity(
                    orbitalVelocity,
                    shell.inclination * Math.PI / 180,
                    raan,
                    trueAnomaly
                );

                // Création du satellite
                const satelliteConfig: SpacecraftConfig = {
                    ...this.satelliteTemplate,
                    name: `${this.name}-${startIndex + plane * shell.satellitesPerPlane + satInPlane}`,
                    position,
                    velocity
                };

                const satellite = new Spacecraft(satelliteConfig);
                this.satellites.push(satellite);
            }
        }
    }

    /**
     * Calcule la position orbitale en coordonnées cartésiennes
     */
    private calculateOrbitalPosition(
        radius: number,
        inclination: number,
        raan: number,
        trueAnomaly: number
    ): THREE.Vector3 {
        // Position dans le plan orbital
        const x_orbital = radius * Math.cos(trueAnomaly);
        const y_orbital = radius * Math.sin(trueAnomaly);
        const z_orbital = 0;

        // Transformation vers le référentiel inertiel
        const cosRaan = Math.cos(raan);
        const sinRaan = Math.sin(raan);
        const cosInc = Math.cos(inclination);
        const sinInc = Math.sin(inclination);

        const x = cosRaan * x_orbital - sinRaan * cosInc * y_orbital;
        const y = sinRaan * x_orbital + cosRaan * cosInc * y_orbital;
        const z = sinInc * y_orbital;

        return new THREE.Vector3(x, y, z);
    }

    /**
     * Calcule la vitesse orbitale en coordonnées cartésiennes
     */
    private calculateOrbitalVelocity(
        orbitalSpeed: number,
        inclination: number,
        raan: number,
        trueAnomaly: number
    ): THREE.Vector3 {
        // Vitesse dans le plan orbital (perpendiculaire au rayon)
        const vx_orbital = -orbitalSpeed * Math.sin(trueAnomaly);
        const vy_orbital = orbitalSpeed * Math.cos(trueAnomaly);
        const vz_orbital = 0;

        // Transformation vers le référentiel inertiel
        const cosRaan = Math.cos(raan);
        const sinRaan = Math.sin(raan);
        const cosInc = Math.cos(inclination);
        const sinInc = Math.sin(inclination);

        const vx = cosRaan * vx_orbital - sinRaan * cosInc * vy_orbital;
        const vy = sinRaan * vx_orbital + cosRaan * cosInc * vy_orbital;
        const vz = sinInc * vy_orbital;

        return new THREE.Vector3(vx, vy, vz);
    }

    /**
     * Propage tous les satellites de la constellation
     */
    public propagate(deltaTime: number): void {
        for (const satellite of this.satellites) {
            satellite.propagate(deltaTime);
        }
    }

    /**
     * Crée la représentation 3D de la constellation
     */
    public createMesh(): THREE.Group {
        this.group.clear();

        for (const satellite of this.satellites) {
            const satelliteMesh = satellite.createMesh();
            this.group.add(satelliteMesh);
        }

        return this.group;
    }

    /**
     * Calcule la couverture globale à un instant donné
     */
    public calculateGlobalCoverage(elevationThreshold: number = 10): number {
        // Simplification : calcul basé sur le nombre de satellites visibles
        // Dans une implémentation complète, il faudrait diviser la surface terrestre
        // en zones et calculer la visibilité depuis chaque zone

        const earthRadius = 6371; // km
        const minElevation = elevationThreshold * Math.PI / 180; // radians

        let totalCoverage = 0;

        for (const satellite of this.satellites) {
            const altitude = satellite.position.length() - earthRadius;
            const maxRange = Math.sqrt(altitude * (altitude + 2 * earthRadius));

            // Aire de couverture approximative (simplifiée)
            const coverageArea = Math.PI * maxRange * maxRange * Math.sin(minElevation);
            totalCoverage += coverageArea;
        }

        const earthSurfaceArea = 4 * Math.PI * earthRadius * earthRadius;
        return Math.min(100, (totalCoverage / earthSurfaceArea) * 100);
    }

    /**
     * Trouve les satellites visibles depuis une position donnée
     */
    public getVisibleSatellites(
        observerPosition: THREE.Vector3,
        minElevation: number = 10
    ): Spacecraft[] {
        const visible: Spacecraft[] = [];
        const minElevationRad = minElevation * Math.PI / 180;

        for (const satellite of this.satellites) {
            const toSatellite = satellite.position.clone().sub(observerPosition);
            const observerNormal = observerPosition.clone().normalize();

            const elevationAngle = Math.asin(
                toSatellite.normalize().dot(observerNormal)
            );

            if (elevationAngle >= minElevationRad) {
                visible.push(satellite);
            }
        }

        return visible;
    }

    /**
     * Met à jour la représentation 3D
     */
    public updateMesh(): void {
        for (const satellite of this.satellites) {
            satellite.updateMesh();
        }
    }

    /**
     * Obtient des statistiques sur la constellation
     */
    public getStats() {
        return {
            name: this.name,
            totalSatellites: this.satellites.length,
            orbitalShells: this.orbitalShells.length,
            averageAltitude: this.getAverageAltitude(),
            totalMass: this.getTotalMass()
        };
    }

    private getAverageAltitude(): number {
        if (this.satellites.length === 0) return 0;

        const earthRadius = 6371;
        const totalAltitude = this.satellites.reduce((sum, sat) => {
            return sum + (sat.position.length() - earthRadius);
        }, 0);

        return totalAltitude / this.satellites.length;
    }

    private getTotalMass(): number {
        return this.satellites.reduce((sum, sat) => sum + sat.masse, 0);
    }

    /**
     * Nettoie les ressources
     */
    public dispose(): void {
        for (const satellite of this.satellites) {
            satellite.dispose?.();
        }
        this.group.clear();
    }
}