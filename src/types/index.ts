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

