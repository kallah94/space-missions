import * as THREE from 'three';
import {OrbitalElements, SpiralPath, ThrustProfile} from "../../types";

export class ElectricPropulsion {
    // public thrusterType: 'ion' | 'hall' | 'ppt';
    // public powerLevel: number;
    // public xenonTank: number;

    public continuousThrust(direction: THREE.Vector3, duration: number): ThrustProfile {
        // Propulsion continue à faible poussée
        return {} as ThrustProfile;
    }

    public spiralTrajectory(initialOrbit: OrbitalElements, finalOrbit: OrbitalElements): SpiralPath {
        // Transferts spiralés optimaux
        return {} as SpiralPath;
    }
}
