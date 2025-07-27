import {SpaceObject} from "./SpaceObject";
import * as THREE from 'three';

export class SpaceDebris extends SpaceObject {
    public size!: 'small' | 'medium' | 'large';
    // public radarCrossSection: number;
    // public rotationRate: THREE.Vector3;

    public atmosphericDecay(altitude: number): number {
        // Modélisation de la rentrée atmosphérique
        return 0;
    }

    createMesh(): THREE.Object3D {
        return new THREE.Object3D();
    }

    propagate(deltaTime: number, gravitationalBodies?: SpaceObject[]): void {
    }
}