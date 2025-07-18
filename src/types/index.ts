import * as THREE from 'three';

// Types de base pour les objects spatiaux
export interface SpaceObjectConfig {
    name: string;
    mass: number; // kg
    position: THREE.Vector3;
    velocity: THREE.Vector3;
}

// Types pour les vaisseaux spatiaux
export interface SpacecraftConfig extends SpaceObjectConfig {
    fuel: number; // kg
    engines: EngineConfig[];
    attitude?: THREE.Quaternion;
}

// Types pour les moteurs
export interface EngineConfig {
    type: 'chemical' | 'electric' | 'nuclear';
    thrust: number; // N
    isp: number; // Impulsion spécifique en secondes
    efficiency: number; // Efficacité du moteur (0-1)
}

// Types pour les planètes
export interface PlanetConfig extends SpaceObjectConfig {
    radius: number; // km
    rotationPeriod: number; // s
    atmosphere?: AtmosphereConfig
    j2?: number; // Coefficient d'aplatissement
    gravityModel?: GravityModelConfig;
}

export interface AtmosphereConfig {
    composition: string[]; // Ex: ["CO2", "N2", "O2"]
    pressure: number; // Pa
    temperature: number; // K
}

export interface GravityModelConfig {
    mu: number; // Constante gravitationnelle (m^3/s^2)
    j2?: number; // Coefficient J2
    j3?: number; // Coefficient J3
    j4?: number; // Coefficient J4
}

// Types pour les éléments orbitaux
export interface OrbitalElements {
    semiMajorAxis: number; // km
    eccentricity: number; // 0-1
    inclination: number; // radians
    longitudeOfAscendingNode: number; // radians
    argumentOfPeriapsis: number; // radians
    trueAnomaly: number; // radians
    epoch: Date; // Date de référence pour les éléments orbitaux
}

// Types pour les manœuvres orbitales
export interface ManeuverConfig {
    time: number; // Temps de la manœuvre en secondes depuis l'epoch
    deltaV: THREE.Vector3; // Variation de vitesse m/s
    duration: number; // Durée de la manœuvre en secondes
    fuelConsumption: number; // Consommation de carburant en kg
}

// Types pour la mission
export interface MissionConfig {
    name: string;
    scene: THREE.Scene;
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    startDate: Date;
    timeScale?: number; // Facteur d'échelle temporelle pour la simulation
    duration?: number; // Durée de la mission en secondes
}

// Types pour l'analyse
export interface TrajectoryPoint {
    time: number; // Temps en secondes depuis le début de la simulation
    position: THREE.Vector3; // Position dans l'espace
    velocity: THREE.Vector3; // Vitesse dans l'espace
    orbitalElements?: OrbitalElements; // Éléments orbitaux à ce point
}

export interface CoverageResult {
    globalCoverage: number; // Pourcentage de couverture globale
    averageAccessTime: number; // Temps d'accès moyen en secondes
    accessIntervals: AccessInterval[]; // Intervalles d'accès pour les objets spatiaux
}

export interface AccessInterval {
    start: Date; // Date de début de l'accès
    end: Date; // Date de fin de l'accès
    maxElevation: number; // Élévation maximale pendant l'accès
}


export interface ConstellationConfig {
    name: string;
    orbitalShells: OrbitalShellConfig[];
    satellite: SpacecraftConfig;
}

export interface OrbitalShellConfig {
    altitude: number; // Altitude en km
    inclination: number; // Inclinaison en degrés
    satellites: number;
    planes: number;
    satellitesPerPlane: number;
}

export interface SatelliteConfig {
    mass: number; // kg
    power: number; // Puissance en watts
    antennas: AntennaConfig[];
}

export interface AntennaConfig {
    type: 'phased_array' | 'parabolic' | 'dipole' | 'horn' | 'helical' | 'dish';
    frequency: number; // Fréquence en GHz
    gain?: number; // Gain en dB
    beamwidth?: number; // Largeur du faisceau en degrés
}


// Types pour les événements spatiaux
export interface SpaceEvent {
    type: 'launch' | 'maneuver' | 'collision' | 'communication';
    timestamp: Date;
    description: string;
    involvedObjects: string[]; // Noms des objets spatiaux impliqués
}

export type MissionEvent =
    | 'launch'
    | 'maneuver'
    | 'docking'
    | 'separation'
    | 'landing'
    | 'orbit_insertion'
    | 'system-failure'

export interface EventCallBack {
    (event: MissionEvent, data: any): void;
}

// types utilitaires
export type Vector3Like = [number, number, number] | THREE.Vector3;
export type QuaternionLike = [number, number, number, number] | THREE.Quaternion;