import { ref, readonly, onUnmounted } from "vue";
import { WebGPURenderer } from "../services/WebGPURenderer";
// import type { AvailableEffectId } from "../services/EffectManager";

// Singleton renderer instance
let renderer: WebGPURenderer | null = null;

export function useWebGPU() {
    const isInitialized = ref(false);
    // const error = ref<string | null>(null);
    // const activeEffects = shallowRef<Map<string, any>>(new Map());

    const initialize = async (canvas: HTMLCanvasElement) => {
        try {
            if (!renderer) {
                renderer = new WebGPURenderer();
                // console.log("WebGPU: Created new renderer");
            }

            await renderer.initialize(canvas);

            isInitialized.value = true;
        } catch (err) {
            throw err;
        }
    };

    const loadImage = async (image: HTMLImageElement) => {
        if (!renderer) {
            throw new Error("Not initialized");
        }

        try {
            await renderer.loadImage(image);
            // console.log("WebGPU: Image loaded successfully");
        } catch (err) {
            throw err;
        }
    };

    // const addEffect = async (
    //     effectId: AvailableEffectId,
    //     settings?: Record<string, any>,
    // ) => {
    //     if (!renderer) throw new Error("Not initialized");

    //     const id = await renderer.addEffect(effectId, settings);
    //     activeEffects.value = new Map(activeEffects.value).set(id, {
    //         effectId,
    //         settings,
    //     });
    //     return id;
    // };

    // const updateEffect = async (id: string, settings: Record<string, any>) => {
    //     if (!renderer) return;
    //     await renderer.updateEffect(id, settings);
    // };

    // const toggleEffect = async (id: string) => {
    //     if (!renderer) return;
    //     await renderer.toggleEffect(id);
    // };

    // const removeEffect = (id: string) => {
    //     if (!renderer) return;
    //     renderer.removeEffect(id);
    //     const newMap = new Map(activeEffects.value);
    //     newMap.delete(id);
    //     activeEffects.value = newMap;
    // };

    onUnmounted(() => {
        renderer?.destroy();
        renderer = null;
    });

    return {
        // State
        isInitialized: readonly(isInitialized),
        // activeEffects: readonly(activeEffects),

        // Actions
        initialize,
        loadImage,
        // addEffect,
        // updateEffect,
        // toggleEffect,
        // removeEffect,
    };
}
