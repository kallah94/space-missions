import * as THREE from 'three';
import {Spacecraft, SpaceObject} from "../objects";

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

export interface ManeuverSequence {
    maneuvers: ManeuverConfig[];
    totalDeltaV: number;
    duration: number;
}

export interface PorkChopData {
    departureWindows: Date[];
    arrivalWindows: Date[];
    deltaVMatrix: number[][];
    flightTimes: number[][];
}

export interface AccessWindow {
    start: Date;
    end: Date;
    maxElevation: number;
    azimuthRange: [number, number];
}

export interface CollisionEvent {
    object1: SpaceObject;
    object2: SpaceObject;
    time: Date;
    probability: number;
    missDistance: number;
}

export interface ConjunctionData {
    time: Date;
    distance: number;
    relativeVelocity: THREE.Vector3;
    probability: number;
}

export interface StationModule {
    name: string;
    type: 'habitation' | 'laboratory' | 'power' | 'storage';
    mass: number;
    volume: number;
}

export interface DockingPort {
    id: string;
    type: 'active' | 'passive';
    occupied: boolean;
    dockedVehicle?: Spacecraft;
}

export interface CargoManifest {
    food: number;
    water: number;
    oxygen: number;
    fuel: number;
    equipment: string[];
}

export interface MineralComposition {
    water: number;
    metals: Map<string, number>;
    rareEarths: Map<string, number>;
}

export interface ResourceAssessment {
    totalValue: number;
    extractionDifficulty: number;
    accessibilityScore: number;
}

export interface CommunicationNode {
    id: string;
    position: THREE.Vector3;
    transmitPower: number;
    antennaGain: number;
    frequency: number;
}

export interface CommunicationLink {
    from: string;
    to: string;
    signalStrength: number;
    latency: number;
    bandwidth: number;
}

export interface MessageRoute {
    path: string[];
    totalLatency: number;
    reliability: number;
}

export interface NetworkGraph {
    nodes: CommunicationNode[];
    edges: CommunicationLink[];
    connectivity: number;
}

export interface SolarActivity {
    solarFlareIndex: number;
    solarWindSpeed: number;
    coronalMassEjection: boolean;
}

export interface RadiationExposure {
    dose: number; // mSv
    particleFlux: number;
    shieldingEffectiveness: number;
}

export interface ThrustProfile {
    direction: THREE.Vector3;
    magnitude: number;
    duration: number;
    fuelConsumption: number;
}

export interface SpiralPath {
    waypoints: THREE.Vector3[];
    thrustVector: THREE.Vector3[];
    timeStamps: number[];
}


export interface TimedEvent {
    time: number;
    type: string;
    data: any;
    source: SpaceObject;
}

export interface EventCallback {
    (event: TimedEvent): void;
}

/**
 * Vecteur d'état complet pour propagation orbitale
 */
export interface StateVector {
    position: THREE.Vector3; // Position en km
    velocity: THREE.Vector3; // Vitesse en km/s
    time: number; // Temps en secondes depuis l'époque
}

/**
 * Vecteur d'état étendu avec informations additionnelles
 */
export interface ExtendedStateVector extends StateVector {
    acceleration?: THREE.Vector3; // Accélération en km/s²
    mass?: number; // Masse en kg
    orbitalElements?: OrbitalElements; // Éléments orbitaux
    energy?: number; // Énergie orbitale spécifique en km²/s²
}

/**
 * Historique de vecteurs d'état pour trajectoires
 */
export interface TrajectoryHistory {
    states: StateVector[];
    startTime: Date;
    endTime: Date;
    timeStep: number;
    propagatorType: string;
}

// ========== TYPES PHYSICS - PROPAGATION ==========

/**
 * Configuration pour propagateurs orbitaux
 */
export interface PropagatorConfig {
    mu: number; // Paramètre gravitationnel en km³/s²
    epoch: Date; // Époque de référence
    timeStep: number; // Pas de temps en secondes
    tolerance?: number; // Tolérance numérique
    maxIterations?: number; // Nombre max d'itérations
}

/**
 * Interface pour dérivée d'état (intégration numérique)
 */
export interface StateDerivative {
    (state: StateVector, time: number): StateVector;
}

/**
 * Interface pour fonctions de force
 */
export interface ForceFunction {
    (position: THREE.Vector3, velocity: THREE.Vector3, time: number): THREE.Vector3;
}

// ========== TYPES PHYSICS - DONNÉES TLE ==========

/**
 * Données Two-Line Element pour SGP4
 */
export interface TLEData {
    satnum: number; // Numéro de satellite NORAD
    epochyr: number; // Année d'époque
    epochdays: number; // Jour julien d'époque
    ndot: number; // Première dérivée du mouvement moyen
    nddot: number; // Seconde dérivée du mouvement moyen
    bstar: number; // Coefficient de traînée BSTAR
    inclo: number; // Inclinaison en radians
    nodeo: number; // Longitude du noeud ascendant en radians
    ecco: number; // Excentricité
    argpo: number; // Argument du périgée en radians
    mo: number; // Anomalie moyenne en radians
    no: number; // Mouvement moyen en radians/minute
}

/**
 * Parsing de données TLE depuis format standard
 */
export interface TLERecord {
    line0: string; // Nom du satellite
    line1: string; // Première ligne TLE
    line2: string; // Deuxième ligne TLE
    parsed?: TLEData; // Données parsées
}

// ========== TYPES PHYSICS - INTÉGRATION ==========

/**
 * Configuration pour intégrateurs numériques
 */
export interface IntegratorConfig {
    method: 'euler' | 'rk4' | 'rkf45' | 'verlet';
    adaptiveStep?: boolean;
    minStep?: number;
    maxStep?: number;
    errorTolerance?: number;
}

/**
 * Résultat d'intégration avec métriques
 */
export interface IntegrationResult {
    states: StateVector[];
    stepsSizes: number[];
    errors: number[];
    totalSteps: number;
    executionTime: number;
}

// ========== TYPES PHYSICS - FORCES ==========

/**
 * Configuration pour modèle de force gravitationnelle
 */
export interface GravitationalForceConfig {
    centralBodyMu: number;
    thirdBodies?: {
        name: string;
        mu: number;
        ephemeris: (time: number) => THREE.Vector3;
    }[];
}

/**
 * Configuration pour perturbations harmoniques
 */
export interface HarmonicPerturbationConfig {
    j2?: number;
    j3?: number;
    j4?: number;
    planetRadius: number;
}

/**
 * Configuration pour traînée atmosphérique
 */
export interface AtmosphericDragConfig {
    cd: number; // Coefficient de traînée
    area: number; // Aire de référence en m²
    mass: number; // Masse en kg
    atmosphereModel: 'exponential' | 'harris-priester' | 'jacchia';
}

/**
 * Configuration pour pression de radiation solaire
 */
export interface SolarRadiationConfig {
    cr: number; // Coefficient de réflectivité
    area: number; // Aire effective en m²
    mass: number; // Masse en kg
    shadowFunction?: (position: THREE.Vector3, sunPosition: THREE.Vector3) => number;
}

// ========== TYPES PHYSICS - COORDONNÉES ==========

/**
 * Système de coordonnées de référence
 */
export type ReferenceFrame =
    | 'ECI'      // Earth-Centered Inertial
    | 'ECEF'     // Earth-Centered Earth-Fixed
    | 'ENU'      // East-North-Up (local)
    | 'LVLH'     // Local Vertical Local Horizontal
    | 'RSW'      // Radial-Along track-Cross track
    | 'EME2000'  // Earth Mean Equator 2000
    | 'TEME';    // True Equator Mean Equinox

/**
 * Transformation entre systèmes de coordonnées
 */
export interface CoordinateTransform {
    from: ReferenceFrame;
    to: ReferenceFrame;
    time: number;
    matrix: THREE.Matrix4;
}

/**
 * Coordonnées géographiques
 */
export interface GeographicCoordinates {
    latitude: number; // Radians
    longitude: number; // Radians
    altitude: number; // km au-dessus de l'ellipsoïde
}

/**
 * Coordonnées sphériques
 */
export interface SphericalCoordinates {
    radius: number; // Distance radiale
    azimuth: number; // Azimut en radians
    elevation: number; // Élévation en radians
}

// ========== TYPES PHYSICS - MODÈLES ==========

/**
 * Modèle atmosphérique
 */
export interface AtmosphereModel {
    getDensity(altitude: number, latitude?: number, longitude?: number, time?: number): number;
    getTemperature(altitude: number, latitude?: number, longitude?: number, time?: number): number;
    getPressure(altitude: number, latitude?: number, longitude?: number, time?: number): number;
}

/**
 * Modèle gravitationnel planétaire
 */
export interface PlanetaryGravityModel {
    mu: number; // Paramètre gravitationnel
    radius: number; // Rayon équatorial
    flattening: number; // Aplatissement
    harmonics: {
        degree: number;
        order: number;
        c: number; // Coefficient cosinus
        s: number; // Coefficient sinus
    }[];
}

// ========== TYPES PHYSICS - SOLVEURS ==========

/**
 * Configuration pour solveur de Lambert
 */
export interface LambertConfig {
    mu: number;
    r1: THREE.Vector3; // Position initiale
    r2: THREE.Vector3; // Position finale
    tof: number; // Temps de vol
    clockwise?: boolean;
    multiRevolution?: number;
}

/**
 * Solution du problème de Lambert
 */
export interface LambertSolution {
    v1: THREE.Vector3; // Vitesse initiale requise
    v2: THREE.Vector3; // Vitesse finale résultante
    deltaV: number; // Delta-V total
    trajectory: StateVector[]; // Trajectoire intermédiaire
    feasible: boolean;
}

/**
 * Configuration pour manoeuvres optimales
 */
export interface ManeuverOptimizationConfig {
    targetOrbit: OrbitalElements;
    constraints: {
        maxDeltaV?: number;
        maxTime?: number;
        fuelLimit?: number;
        thrustLimit?: number;
    };
    objectives: ('deltaV' | 'time' | 'fuel')[];
}

// ========== TYPES PHYSICS - VALIDATION ==========

/**
 * Métriques de précision pour validation
 */
export interface AccuracyMetrics {
    positionError: number; // Erreur RMS position en km
    velocityError: number; // Erreur RMS vitesse en km/s
    energyError: number; // Erreur énergie relative
    angularMomentumError: number; // Erreur moment angulaire relative
    maxPositionError: number; // Erreur position maximale
    maxVelocityError: number; // Erreur vitesse maximale
}

/**
 * Cas de test standard pour validation
 */
export interface ValidationTestCase {
    name: string;
    description: string;
    initialState: StateVector;
    expectedFinalState: StateVector;
    duration: number;
    tolerance: AccuracyMetrics;
    forces: string[]; // Liste des forces à appliquer
}

// ========== TYPES PHYSICS - ANALYSE ==========

/**
 * Caractéristiques orbitales calculées
 */
export interface OrbitalCharacteristics {
    period: number; // Période orbitale en secondes
    apoapsis: number; // Altitude apoapside en km
    periapsis: number; // Altitude périapside en km
    meanMotion: number; // Mouvement moyen en rad/s
    velocityApoapsis: number; // Vitesse à l'apoapside
    velocityPeriapsis: number; // Vitesse au périapside
    specificEnergy: number; // Énergie spécifique
    angularMomentum: number; // Moment angulaire spécifique
}

/**
 * Analyse de résonance orbitale
 */
export interface ResonanceAnalysis {
    resonances: {
        ratio: [number, number]; // Ratio n:m
        strength: number; // Force de la résonance
        librationAmplitude?: number; // Amplitude de libration
    }[];
    dominantResonance?: [number, number];
    isResonant: boolean;
}

/**
 * Analyse de stabilité orbitale
 */
export interface StabilityAnalysis {
    lyapunovExponent: number; // Exposant de Lyapunov
    chaosIndicator: number; // Indicateur de chaos
    stableRegions: {
        elements: Partial<OrbitalElements>;
        stabilityTime: number;
    }[];
    isStable: boolean;
}

// ========== TYPES PHYSICS - ÉVÉNEMENTS ==========

/**
 * Événement orbital détectable
 */
export interface OrbitalEvent {
    type: 'apoapsis' | 'periapsis' | 'ascending_node' | 'descending_node' | 'eclipse';
    time: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    metadata?: Record<string, any>;
}

/**
 * Détecteur d'événements orbitaux
 */
export interface EventDetector {
    type: OrbitalEvent['type'];
    tolerance: number;
    detect: (state: StateVector, prevState?: StateVector) => boolean;
    refine?: (states: StateVector[]) => OrbitalEvent;
}

// types utilitaires
export type Vector3Like = [number, number, number] | THREE.Vector3;
export type QuaternionLike = [number, number, number, number] | THREE.Quaternion;