import { ref, shallowRef, readonly } from "vue";

// Global singleton state for WebGPU
const isInitialized = ref(false);
const activeEffects = shallowRef<Map<string, any>>(new Map());

// Export readonly versions and setters
export function useWebGPUState() {
    const setInitialized = (value: boolean) => {
        console.log("🔧 WebGPUState: Setting isInitialized to", value);
        isInitialized.value = value;
    };

    const setActiveEffects = (effects: Map<string, any>) => {
        activeEffects.value = new Map(effects);
    };

    const addActiveEffect = (id: string, effect: any) => {
        const newMap = new Map(activeEffects.value);
        newMap.set(id, effect);
        activeEffects.value = newMap;
    };

    const removeActiveEffect = (id: string) => {
        const newMap = new Map(activeEffects.value);
        newMap.delete(id);
        activeEffects.value = newMap;
    };

    return {
        // Readonly state
        isInitialized: readonly(isInitialized),
        activeEffects: readonly(activeEffects),

        // Setters
        setInitialized,
        setActiveEffects,
        addActiveEffect,
        removeActiveEffect,
    };
}
