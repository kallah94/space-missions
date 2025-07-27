import * as THREE from 'three'
import {
    SpaceObjectConfig,
    ManeuverConfig,
    OrbitalShellConfig,
    EngineConfig,
    SpacecraftConfig,
    OrbitalElements
} from "../types";

export class Spacecraft {
    public readonly name!: string;
    public masse!: number; // kg
    public fuel!: number; // kg
    public position!: THREE.Vector3;
    public velocity!: THREE.Vector3;
    public attitude!: THREE.Quaternion;
    public engines!: EngineConfig[];

    private mesh?: THREE.Object3D;
    private maneuvers: ManeuverConfig[] = [];

    constructor(config: SpacecraftConfig) {
        this.name = config.name;
        this.masse = config.mass;
        this.position = config.position.clone();
        this.velocity = config.velocity.clone();
        this.attitude = config.attitude || new THREE.Quaternion();
        this.engines = [...config.engines];
    }

    /**
     * Ajouter une manœuvre à la sequence
     */
    public addManeuver(maneuver: ManeuverConfig): void {
        this.maneuvers.push(maneuver);
        this.maneuvers.sort((a, b) => a.time - b.time);
    }

    /**
     * Exécuter une manœuvre à un instant donné
     */
    public executeManeuver(maneuver: ManeuverConfig): boolean {
        if (this.fuel < (maneuver.fuelConsumption || 0)) {
            console.warn(`Carburant insuffisant pour la manœuvre ${maneuver.time}`);
            return false;
        }

        // Appliquer le deltaV
        this.velocity.add(maneuver.deltaV);

        // Consommer le carburant
        if (maneuver.fuelConsumption) {
            this.consumeFuel(maneuver.fuelConsumption);
        }

        return true
    }

    /**
     * Met a jour l'attitude du vaisseau
     */
    public updateAttitude(quaternion: THREE.Quaternion): void {
        this.attitude.copy(quaternion);
        if (this.mesh) {
        this.mesh.quaternion.copy(this.attitude);}
    }

    /**
     * Consommer du carburant
     */
    public consumeFuel(amount: number): void {
        this.fuel = Math.max(0, this.fuel - amount);
        this.updateMass()
    }

    /**
     * Calcule les éléments orbitaux actuels
     */
    public getOrbitalElements(mu: number = 398600.4418): OrbitalElements {
        // Implémentation du calcul des éléments orbitaux
        // Basé sur les vecteurs position et vitesse
        const r = this.position.length()
        const v = this.velocity.length()

        // Calcul de l'énergie spécifique
        const energy = (v * v ) / 2 - mu / r;
        const semiMajorAxis = -mu / (2 * energy);

        // Calcul du vecteur excentricité
        const h = new THREE.Vector3().crossVectors(this.position, this.velocity);
        const eVector = new THREE.Vector3()
            .crossVectors(this.velocity, h)
            .divideScalar(mu)
            .sub(this.position.clone().normalize());

        const eccentricity = eVector.length();

        // Calcul de l'inclinaison
        const  inclinaison = Math.acos(h.z / h.length());

        // Autres éléments orbitaux
        const longitudeOfAscendingNode = Math.atan2(h.x, -h.y);
        const argumentOfPeriapsis = Math.atan2(eVector.y, eVector.x);
        const trueAnomaly = Math.atan2(this.position.y, this.position.x);

        return {
            semiMajorAxis: semiMajorAxis,
            eccentricity: eccentricity,
            inclination: inclinaison,
            longitudeOfAscendingNode: longitudeOfAscendingNode,
            argumentOfPeriapsis: argumentOfPeriapsis,
            trueAnomaly: trueAnomaly,
            epoch: new Date() // Date actuelle comme référence
        }
    }

    /**
     * Propage la position et la vitesse dans le temps
     */
    public propagate(deltaTime: number, mu: number = 398600.4418): void {
        // Propagation simplifiée (Kepler)
        // Pour une implémentation complète, utiliser un propagateur numérique
        const r = this.position.length();
        const acceleration = this.position.clone()
            .normalize()
            .multiplyScalar(-mu / (r * r));

        // Intégration d'Euler (à remplacer par RK4 ou autre)
        this.velocity.add(acceleration.multiplyScalar(deltaTime));
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    }

    /**
     * Met à jour la masse totale
     */
    private updateMass(): void {
        // La masse totale = masse à sec + carburant
        // Cette méthode peut être étendue pour des calculs plus complexes
    }

    /**
     * Crée la représentation 3D du vaisseau
     */
    public createMesh(): THREE.Object3D {
        if (!this.mesh) {
            // Géométrie simple pour commencer
            const geometry = new THREE.ConeGeometry(0.5, 2, 8)
            const material = new THREE.MeshBasicMaterial({ color: 0x888888  });
            this.mesh = new THREE.Mesh(geometry, material)

            // Orienter le cone vers l'avant
            this.mesh.rotateX(-Math.PI / 2)
        }

        // Mettre à jour la position et l'attitude
        this.mesh.position.copy(this.position)
        this.mesh.quaternion.copy(this.attitude)

        return this.mesh
    }

    /**
     * Obtient le ratio carburant/masse totale
     */
    public getFuelRatio(): number {
        return this.fuel / (this.masse + this.fuel);
    }

    /**
     * Vérifie si le vaisseau peut effectuer une manœuvre
     */
    public canExecuteManeuver(maneuver: ManeuverConfig): boolean {
        const requiredFuel = maneuver.fuelConsumption || 0;
        return this.fuel >= requiredFuel;
    }
}