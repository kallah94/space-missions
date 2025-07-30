
/**
 * Module des solveurs de mécanique orbitale
 * Contient les algorithmes pour résoudre les problèmes orbitaux classiques
 */

export { KeplerSolver } from './KeplerSolver';
export { LambertSolver } from './LambertSolver';
export { ManeuverOptimizer } from './ManeuverOptimizer';
export { OrbitalMechanicsSolver } from './OrbitalMechanicsSolver';

// Réexport des types pertinents
export type {
    LambertConfig,
    LambertSolution,
    ManeuverOptimizationConfig,
    StateVector,
    OrbitalElements
} from '../../types';