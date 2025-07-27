import * as THREE from 'three';
import {SpaceObject} from "./SpaceObject";
import {MineralComposition, ResourceAssessment} from "../types";

export class Asteroid extends SpaceObject {
    // public composition: MineralComposition;
    // public rotationPeriod: number;
    // public albedo: number;

    public miningPotential(): ResourceAssessment {
        // Évaluation du potentiel minier
        return {} as ResourceAssessment;
    }

    createMesh(): THREE.Object3D {
        return new THREE.Object3D;
    }

    propagate(deltaTime: number, gravitationalBodies?: SpaceObject[]): void {
    }
}