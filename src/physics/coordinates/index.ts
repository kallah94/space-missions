/**
 * Module de gestion des systèmes de coordonnées
 * Contient les outils de transformation entre différents référentiels spatiaux
 */

export { CoordinateTransformer } from './CoordinateTransformer';
export { ReferenceFrames } from './ReferenceFrames';
export { CoordinateUtils } from './CoordinateUtils';

// Réexport des types pertinents
export type {
    ReferenceFrame,
    CoordinateTransform,
    GeographicCoordinates,
    SphericalCoordinates
} from '../../types';