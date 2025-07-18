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
    epoch: Date; // Date de référence pour les éléments orbitauxg
}