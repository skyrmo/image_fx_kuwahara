import { ref, readonly, onUnmounted, shallowRef } from "vue";
import { WebGPURenderer } from "../services/WebGPURenderer";
// import type { AvailableEffectId } from "../services/EffectManager";

// Singleton renderer instance
let renderer: WebGPURenderer | null = null;

export function useWebGPU() {
    const isInitialized = ref(false);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const activeEffects = shallowRef<Map<string, any>>(new Map());

    const initialize = async (canvas: HTMLCanvasElement) => {
        try {
            // console.log("WebGPU: Starting initialization...");
            isLoading.value = true;
            error.value = null;

            if (!renderer) {
                renderer = new WebGPURenderer();
                // console.log("WebGPU: Created new renderer");
            }

            await renderer.initialize(canvas);
            // console.log("WebGPU: Renderer initialized successfully");
            isInitialized.value = true;
        } catch (err) {
            console.error("WebGPU: Initialization failed:", err);
            error.value =
                err instanceof Error ? err.message : "Failed to initialize";
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadImage = async (image: HTMLImageElement) => {
        if (!renderer) {
            console.error("WebGPU: Renderer not initialized");
            throw new Error("Not initialized");
        }

        try {
            // console.log(
            //     "WebGPU: Loading image...",
            //     image.width,
            //     "x",
            //     image.height,
            // );
            isLoading.value = true;
            await renderer.loadImage(image);
            // console.log("WebGPU: Image loaded successfully");
        } catch (err) {
            console.error("WebGPU: Failed to load image:", err);
            error.value =
                err instanceof Error ? err.message : "Failed to load image";
            throw err;
        } finally {
            isLoading.value = false;
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
        isLoading: readonly(isLoading),
        error: readonly(error),
        activeEffects: readonly(activeEffects),

        // Actions
        initialize,
        loadImage,
        // addEffect,
        // updateEffect,
        // toggleEffect,
        // removeEffect,
    };
}
