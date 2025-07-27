import {SpaceObject} from "./SpaceObject";
import {Spacecraft} from "./Spacecraft";
import {CargoManifest, DockingPort, StationModule} from "../types";
import * as THREE from 'three';

export class SpaceStation extends SpaceObject {
    public modules: StationModule[] = [];
    public crew: number = 0;
    public dockingPorts: DockingPort[] = [];

    public dockSpacecraft(spacecraft: Spacecraft, portId: string): boolean {
        // Procédure d'amarrage automatique
        return true;
    }

    public resupply(cargo: CargoManifest): void {
        // Gestion des ressources et ravitaillement
    }

    createMesh(): THREE.Object3D {
        return new THREE.Object3D(); // Placeholder for actual mesh creation
    }

    propagate(deltaTime: number, gravitationalBodies?: SpaceObject[]): void {
    }
}