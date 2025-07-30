import * as THREE from 'three';
import { Force } from './Force';
import {GravitationalForce} from "./GravitationalForce";
import {SolarRadiationPressure} from "./SolarRadiationPressure";
import {J3J4Perturbation} from "./J3J4Perturbation";
import {J2Perturbation} from "./J2Perturbation";
import {AtmosphericDrag} from "./AtmosphericDrag";
import {ThirdBodyPerturbation} from "./ThirdBodyPerturbation";
import {ThrustForce} from "./ThrustForce";

/**
 * Modèle de forces combinées pour simulation
 */
export class ForceModel {
    private forces: Force[] = [];
    private enabledForces: Set<string> = new Set();

    /**
     * Ajoute une force au modèle
     */
    public addForce(force: Force): void {
        this.forces.push(force);
        if (force.enabled) {
            this.enabledForces.add(force.name);
        }
    }

    /**
     * Calcule l'accélération totale
     */
    public calculateTotalAcceleration(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        mass: number,
        time: number
    ): THREE.Vector3 {
        let totalAcceleration = new THREE.Vector3(0, 0, 0);

        for (const force of this.forces) {
            if (force.enabled && force.isApplicable(position, velocity, time)) {
                const acceleration = force.calculateAcceleration(position, velocity, mass, time);
                totalAcceleration.add(acceleration);
            }
        }

        return totalAcceleration;
    }

    /**
     * Active ou désactive une force
     */
    public toggleForce(forceName: string, enabled: boolean): void {
        const force = this.forces.find(f => f.name === forceName);
        if (force) {
            force.setEnabled(enabled);
            if (enabled) {
                this.enabledForces.add(forceName);
            } else {
                this.enabledForces.delete(forceName);
            }
        }
    }

    /**
     * Obtient les forces actives
     */
    public getActiveForces(): string[] {
        return Array.from(this.enabledForces);
    }

    /**
     * Analyse l'importance relative des forces
     */
    public analyzeForceContributions(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        mass: number,
        time: number
    ): { [forceName: string]: number } {
        const contributions: { [forceName: string]: number } = {};

        for (const force of this.forces) {
            if (force.enabled && force.isApplicable(position, velocity, time)) {
                const acceleration = force.calculateAcceleration(position, velocity, mass, time);
                contributions[force.name] = acceleration.length();
            }
        }

        return contributions;
    }

    /**
     * Crée un modèle de forces standard pour orbite terrestre basse
     */
    public static createLEOModel(satelliteMass: number, area: number): ForceModel {
        const model = new ForceModel();

        // Force gravitationnelle principale
        const gravity = new GravitationalForce({
            centralBodyMu: 398600.4418 // Terre
        });
        model.addForce(gravity);

        // Perturbation J2
        const j2 = new J2Perturbation({
            j2: 1.08262668e-3,
            planetRadius: 6378.137
        });
        model.addForce(j2);

        // Traînée atmosphérique
        const drag = new AtmosphericDrag({
            cd: 2.2,
            area: area,
            mass: satelliteMass,
            atmosphereModel: 'exponential'
        });
        model.addForce(drag);

        // Pression de radiation solaire
        const srp = new SolarRadiationPressure({
            cr: 1.3,
            area: area,
            mass: satelliteMass
        });
        model.addForce(srp);

        return model;
    }

    /**
     * Crée un modèle pour orbite géostationnaire
     */
    public static createGEOModel(satelliteMass: number, area: number): ForceModel {
        const model = new ForceModel();

        // Force gravitationnelle avec corps tiers
        const gravity = new GravitationalForce({
            centralBodyMu: 398600.4418,
            thirdBodies: [
                {
                    name: 'Moon',
                    mu: 4902.800066,
                    ephemeris: ThirdBodyPerturbation.createLunarEphemeris()
                },
                {
                    name: 'Sun',
                    mu: 132712442018,
                    ephemeris: ThirdBodyPerturbation.createSolarEphemeris()
                }
            ]
        });
        model.addForce(gravity);

        // Perturbations harmoniques
        const j2 = new J2Perturbation({
            j2: 1.08262668e-3,
            planetRadius: 6378.137
        });
        model.addForce(j2);

        const j3j4 = new J3J4Perturbation({
            j3: -2.53265648e-6,
            j4: -1.61962159e-6,
            planetRadius: 6378.137
        });
        model.addForce(j3j4);

        // Pression de radiation solaire (importante en GEO)
        const srp = new SolarRadiationPressure({
            cr: 1.3,
            area: area,
            mass: satelliteMass
        });
        model.addForce(srp);

        return model;
    }

    /**
     * Crée un modèle pour mission interplanétaire
     */
    public static createInterplanetaryModel(spacecraftMass: number): ForceModel {
        const model = new ForceModel();

        // Force gravitationnelle du Soleil
        const solarGravity = new GravitationalForce({
            centralBodyMu: 132712442018 // Soleil
        });
        model.addForce(solarGravity);

        // Pression de radiation solaire
        const srp = new SolarRadiationPressure({
            cr: 1.3,
            area: 10, // Surface typique
            mass: spacecraftMass
        });
        model.addForce(srp);

        // Capacité d'ajouter la poussée
        const thrust = new ThrustForce();
        model.addForce(thrust);

        return model;
    }
}
