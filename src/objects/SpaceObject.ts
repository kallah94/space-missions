import * as THREE from 'three';
import { SpaceObjectConfig, OrbitalElements } from '../types';

/**
 * Classe de base pour tous les objets spatiaux
 */
export abstract class SpaceObject {
    public readonly name: string;
    public mass: number; // kg
    public position: THREE.Vector3;
    public velocity: THREE.Vector3;

    protected mesh?: THREE.Object3D;
    protected trail: THREE.Vector3[] = [];
    protected maxTrailLength: number = 1000;

    constructor(config: SpaceObjectConfig) {
        this.name = config.name;
        this.mass = config.mass;
        this.position = config.position.clone();
        this.velocity = config.velocity.clone();
    }

    /**
     * Met à jour la position de l'objet dans le temps
     */
    public abstract propagate(deltaTime: number, gravitationalBodies?: SpaceObject[]): void;

    /**
     * Crée la représentation 3D de l'objet
     */
    public abstract createMesh(): THREE.Object3D;

    /**
     * Calcule les éléments orbitaux par rapport à un corps central
     */
    public getOrbitalElements(centralBodyMu: number = 398600.4418): OrbitalElements {
        const r = this.position.length();
        const v = this.velocity.length();

        // Calcul de l'énergie spécifique
        const energy = (v * v) / 2 - centralBodyMu / r;
        const semiMajorAxis = -centralBodyMu / (2 * energy);

        // Vecteur moment angulaire
        const h = new THREE.Vector3().crossVectors(this.position, this.velocity);
        const hMagnitude = h.length();

        // Vecteur excentricité
        const eVector = new THREE.Vector3()
            .crossVectors(this.velocity, h)
            .divideScalar(centralBodyMu)
            .sub(this.position.clone().normalize());

        const eccentricity = eVector.length();

        // Inclinaison
        const inclination = Math.acos(h.z / hMagnitude);

        // Longitude du nœud ascendant
        const nodeVector = new THREE.Vector3(-h.y, h.x, 0);
        const longitudeOfAscendingNode = Math.atan2(nodeVector.y, nodeVector.x);

        // Argument du périastre
        const argumentOfPeriapsis = Math.acos(
            nodeVector.normalize().dot(eVector.normalize())
        );

        // Anomalie vraie
        const trueAnomaly = Math.acos(
            eVector.normalize().dot(this.position.normalize())
        );

        return {
            semiMajorAxis,
            eccentricity,
            inclination,
            longitudeOfAscendingNode,
            argumentOfPeriapsis,
            trueAnomaly,
            epoch: new Date()
        };
    }

    /**
     * Ajoute un point à la trajectoire
     */
    public addTrailPoint(): void {
        this.trail.push(this.position.clone());

        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }

    /**
     * Crée une ligne représentant la trajectoire
     */
    public createTrailMesh(): THREE.Line {
        const geometry = new THREE.BufferGeometry().setFromPoints(this.trail);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.6
        });

        return new THREE.Line(geometry, material);
    }

    /**
     * Calcule la distance à un autre objet spatial
     */
    public distanceTo(other: SpaceObject): number {
        return this.position.distanceTo(other.position);
    }

    /**
     * Calcule la vitesse relative par rapport à un autre objet
     */
    public relativeVelocity(other: SpaceObject): THREE.Vector3 {
        return this.velocity.clone().sub(other.velocity);
    }

    /**
     * Met à jour la représentation 3D
     */
    public updateMesh(): void {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
    }

    /**
     * Calcule l'énergie orbitale spécifique
     */
    public getOrbitalEnergy(centralBodyMu: number = 398600.4418): number {
        const r = this.position.length();
        const v = this.velocity.length();

        return (v * v) / 2 - centralBodyMu / r;
    }

    /**
     * Vérifie si l'orbite est liée (elliptique/circulaire) ou non liée (hyperbolique/parabolique)
     */
    public isBoundOrbit(centralBodyMu: number = 398600.4418): boolean {
        return this.getOrbitalEnergy(centralBodyMu) < 0;
    }

    /**
     * Nettoie les ressources
     */
    public dispose(): void {
        if (this.mesh) {
            this.mesh.clear();
        }
        this.trail.length = 0;
    }
}