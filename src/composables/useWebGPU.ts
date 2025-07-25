import { ref, onUnmounted } from "vue";
import { WebGPUService } from "../services/webgpu.service";

export function useWebGPU() {
    const service = ref<WebGPUService>();
    const isInitialized = ref(false);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const initialize = async (canvas: HTMLCanvasElement) => {
        try {
            isLoading.value = true;
            error.value = null;

            service.value = new WebGPUService();

            await service.value.initialize(canvas);

            isInitialized.value = true;
        } catch (err) {
            error.value =
                err instanceof Error
                    ? err.message
                    : "Failed to initialize WebGPU";

            console.error("WebGPU initialization failed:", err);
        } finally {
            isLoading.value = false;
        }
    };

    const processImage = async (image: HTMLImageElement) => {
        if (!service.value || !isInitialized.value) {
            throw new Error("WebGPU service not initialized");
        }

        try {
            isLoading.value = true;
            error.value = null;
            await service.value.initImage(image);
        } catch (err) {
            error.value =
                err instanceof Error ? err.message : "Failed to process image";
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const updateSettings = async () => {
        if (!service.value || !isInitialized.value) return;

        try {
            error.value = null;
            await service.value.updateSettings();
        } catch (err) {
            error.value =
                err instanceof Error
                    ? err.message
                    : "Failed to update settings";
            console.error("Settings update failed:", err);
        }
    };

    const cleanup = () => {
        if (service.value) {
            service.value.destroy?.();
            service.value = undefined;
        }
        isInitialized.value = false;
        error.value = null;
    };

    // Cleanup on unmount
    onUnmounted(cleanup);

    return {
        isInitialized: readonly(isInitialized),
        isLoading: readonly(isLoading),
        error: readonly(error),
        initialize,
        processImage,
        updateSettings,
        cleanup,
    };
}
