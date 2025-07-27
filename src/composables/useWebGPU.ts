import { onUnmounted } from "vue";
import { WebGPURenderer } from "../services/WebGPURenderer";
import type { AvailableEffectId } from "../services/EffectManager";
import { useWebGPUState } from "./useWebGPUState";

// Singleton renderer instance
let renderer: WebGPURenderer | null = null;

export function useWebGPU() {
    const {
        isInitialized,
        activeEffects,
        setInitialized,
        addActiveEffect,
        removeActiveEffect,
    } = useWebGPUState();

    const initialize = async (canvas: HTMLCanvasElement) => {
        try {
            if (!renderer) {
                renderer = new WebGPURenderer();
                // console.log("WebGPU: Created new renderer");
            }

            await renderer.initialize(canvas);

            setInitialized(true);
            console.log("🔧 useWebGPU: isInitialized set to true");
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

    const addEffect = async (
        effectId: AvailableEffectId,
        settings?: Record<string, any>,
    ) => {
        if (!renderer) throw new Error("Not initialized");

        const id = await renderer.addEffect(effectId, settings);
        addActiveEffect(id, {
            effectId,
            settings,
        });
        return id;
    };

    const updateEffect = async (id: string, settings: Record<string, any>) => {
        if (!renderer) return;
        await renderer.updateEffect(id, settings);
    };

    const removeEffect = (id: string) => {
        if (!renderer) return;
        renderer.removeEffect(id);
        removeActiveEffect(id);
    };

    onUnmounted(() => {
        console.log("🧹 useWebGPU: Component unmounting");
        // Don't destroy shared resources on component unmount
        // renderer?.destroy();
        // renderer = null;
    });

    return {
        // State
        isInitialized,
        activeEffects,

        // Actions
        initialize,
        loadImage,
        addEffect,
        updateEffect,
        removeEffect,
    };
}
