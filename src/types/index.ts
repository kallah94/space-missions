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

