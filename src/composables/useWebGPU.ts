import { ref, onUnmounted, watch, readonly, nextTick } from "vue";
import { useImageState, useSettingsState } from "./useAppState";
import { WebGPUService } from "../services/webgpu.service";

let webGPUInstance: WebGPUService | null;

export function useWebGPU() {
    const { imageState } = useImageState();
    const { settingsState } = useSettingsState();

    const isInitialized = ref(false);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const canvas = ref<HTMLCanvasElement>();

    const initialize = async (canvasElement: HTMLCanvasElement) => {
        try {
            isLoading.value = true;
            error.value = null;
            canvas.value = canvasElement;

            // Create singleton instance
            if (!webGPUInstance) {
                webGPUInstance = new WebGPUService();
            }

            await webGPUInstance.initialize(canvasElement);
            isInitialized.value = true;

            // Set up watchers after initialization
            setupWatchers();
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Failed to initialize WebGPU";
            error.value = message;
            console.error("WebGPU initialization failed:", err);
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const setupWatchers = () => {
        // Watch for image changes
        watch(
            () => imageState.image,
            async (newImage) => {
                if (newImage && webGPUInstance && isInitialized.value) {
                    try {
                        isLoading.value = true;
                        error.value = null;
                        await webGPUInstance.loadImage(newImage);
                    } catch (err) {
                        error.value =
                            err instanceof Error
                                ? err.message
                                : "Failed to load image";
                    } finally {
                        isLoading.value = false;
                    }
                }
            },
        );

        // Watch for settings changes
        watch(
            settingsState,
            async () => {
                if (imageState.image && webGPUInstance && isInitialized.value) {
                    try {
                        await nextTick();
                        await webGPUInstance.updateSettings(settingsState);
                    } catch (err) {
                        error.value =
                            err instanceof Error
                                ? err.message
                                : "Failed to update settings";
                    }
                }
            },
            { deep: true },
        );
    };

    const destroy = () => {
        if (webGPUInstance) {
            webGPUInstance.destroy();
            webGPUInstance = null;
        }
        isInitialized.value = false;
        error.value = null;
    };

    // Cleanup on unmount
    onUnmounted(() => {
        // Only destroy if this is the last component using WebGPU
        // In a real app, you might want more sophisticated reference counting
        destroy();
    });

    return {
        // Reactive state
        isInitialized: readonly(isInitialized),
        isLoading: readonly(isLoading),
        error: readonly(error),

        // Actions
        initialize,
        destroy,
    };
}
