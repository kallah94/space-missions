import {AtmosphereConfig, GravityModelConfig, PlanetConfig} from "../types";
import * as THREE from 'three';


export class Planet {
    public readonly name: string
    public readonly mass: number // kg
    public readonly raduis: number // km
    public readonly rotationPeriod: number // secondes
    public readonly position: THREE.Vector3
    public readonly velocity: THREE.Vector3
    public readonly atmosphere?: AtmosphereConfig
    public readonly gravityModel?: GravityModelConfig

    private mesh?: THREE.Object3D
    private atmosphereMesh?: THREE.Object3D
    private rotationAngle: number = 0

    constructor(config: PlanetConfig) {
        this.name = config.name
        this.mass = config.mass
        this.raduis = config.radius
        this.rotationPeriod = config.rotationPeriod
        this.position = config.position.clone()
        this.velocity = config.velocity.clone()
        this.atmosphere = config.atmosphere

        // Configuration du modele gravitationnel par defaut
        this.gravityModel = config.gravityModel || {
            mu: 3.986004418e14, // Constante gravitationnelle de la Terre en m^3/s^2
            j2: 1.08262668e-3, // Coefficient J2 de la Terre
        }
    }

    /**
     * Met à jour la rotation de la planète
     */
    public updateRotation(deltaTime: number): void {
        this.rotationAngle += (2 * Math.PI * deltaTime) / this.rotationPeriod

        if (this.mesh) {
            this.mesh.rotation.y = this.rotationAngle
        }
    }

    /**
     * Calcul de l attraction gravitationnelle de la planète
     */
    public getGravitationalForce(objectPosition: THREE.Vector3, objectMass: number): THREE.Vector3 {
        const r = objectPosition.clone().sub(this.position);
        const distance = r.length();

        // Force gravitationnelle newtonienne
        const forceMagnitude = ((this.gravityModel?.mu || 0) * objectMass) / (distance * distance)

        return r.normalize().multiplyScalar(-forceMagnitude);
    }

    /**
     * Verifie si un object est dans l atmosphere
     */
    public isinAtmosphere(objectPosition: THREE.Vector3): boolean {
        if (!this.atmosphere) return false
        const distanceToPlanet = objectPosition.distanceTo(this.position);
        // Altitude atmospherique approximative (100 km au-dessus de la surface)
        const atmosphereAltitude = this.raduis + 100; // km
        return distanceToPlanet <= atmosphereAltitude;
    }

    /**
     * Crée la représentation 3D de la planète
     */
    public createMesh(textureUrl?: string): THREE.Object3D {
        if (!this.mesh) {
            const geometry = new THREE.SphereGeometry(this.raduis / 1000, 64, 32); // Rayon en km

            let material: THREE.Material
            if (textureUrl) {
                const texture = new THREE.TextureLoader().load(textureUrl);
                material = new THREE.MeshStandardMaterial({ map: texture });
            } else {
                material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
            }

            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.copy(this.position)

            if (this.atmosphere) {
                this.createAtmosphereMesh();
            }
        }
        return this.mesh
    }

    /**
     * Crée la représentation 3D de l'atmosphère
     */
    private createAtmosphereMesh(): void {
        if (!this.atmosphere) return

        const atmosphereGeometry = new THREE.SphereGeometry((this.raduis + 100) / 1000, 32, 16); // Rayon en km
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x87ceeb,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });

        this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
        this.atmosphereMesh.position.copy(this.position)

        if (this.mesh) {
            this.mesh.add(this.atmosphereMesh);
        }
    }

    /**
     * Met à jour la position de la planète
     */
    public propagate(deltaTime: number): void {
        // Pour une planète, la position ne change pas dans le cadre de ce modèle simplifié
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime))

        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
    }

    /**
     * Calcul de l'angle d elevation depuis la surface
     */
    public getElevationAngle(surfacePosition: THREE.Vector3, targetPosition: THREE.Vector3): number {
        const toTarget = targetPosition.clone().sub(surfacePosition);
        const surfaceNormal = surfacePosition.clone().sub(this.position).normalize()

        return Math.asin(toTarget.normalize().dot(surfaceNormal)) // en radians

    }
}