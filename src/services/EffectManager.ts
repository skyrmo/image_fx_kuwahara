import { KMeansEffect } from "../effects/KMeansEffect";
import { BlurEffect } from "../effects/BlurEffect";
// Import other effects as needed

// Simple registry of available effects
export const AVAILABLE_EFFECTS = {
    kmeans: KMeansEffect,
    blur: BlurEffect,
} as const;

export type AvailableEffectId = keyof typeof AVAILABLE_EFFECTS;

export function createEffect(device: GPUDevice, effectId: AvailableEffectId) {
    const EffectClass = AVAILABLE_EFFECTS[effectId];
    if (!EffectClass) {
        throw new Error(`Unknown effect: ${effectId}`);
    }
    return new EffectClass(device);
}

// export function getEffectDefinition(effectId: AvailableEffectId) {
//     const EffectClass = AVAILABLE_EFFECTS[effectId];
//     return EffectClass?.definition;
// }

// export function getAllEffectDefinitions() {
//     return Object.values(AVAILABLE_EFFECTS).map(
//         (EffectClass) => EffectClass.definition,
//     );
// }
