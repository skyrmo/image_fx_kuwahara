import { reactive, readonly } from "vue";

// Settings State
export interface SettingsState {
    kernelSize: number;
    enableKMeans: boolean;
    numColors: number;
}

// Global state - these will be shared across components:
// Settings State
const settingsState = reactive<SettingsState>({
    kernelSize: 9,
    enableKMeans: false,
    numColors: 8,
});

// Composables
// Settings State
export function useSettingsState() {
    return {
        settingsState: readonly(settingsState),
        updateSettings: (newSettings: Partial<SettingsState>) => {
            Object.assign(settingsState, newSettings);
        },
        resetSettings: () => {
            Object.assign(settingsState, {
                kernelSize: 9,
                enableKMeans: false,
                numColors: 8,
            });
        },
    };
}

// App State
export interface AppState {
    // isLoading: boolean;
    // isProcessing: boolean;
    // error: string | null;
    // webGPUSupported: boolean;
    // showOriginal: boolean;
}

// Global state - these will be shared across components:
// App State
const appState = reactive<AppState>({
    // isLoading: false,
    // isProcessing: false,
    // error: null,
    // webGPUSupported: false,
    // showOriginal: false,
});

// Composables
// App State
export function useAppState() {
    return {
        appState: readonly(appState),
        // setLoading: (loading: boolean) => {
        //     appState.isLoading = loading;
        // },
        // setProcessing: (processing: boolean) => {
        //     appState.isProcessing = processing;
        // },
        // setError: (error: string | null) => {
        //     appState.error = error;
        // },
        // setWebGPUSupported: (supported: boolean) => {
        //     appState.webGPUSupported = supported;
        // },
        // setShowOriginal: (show: boolean) => {
        //     appState.showOriginal = show;
        // },
    };
}

// Image State
export interface ImageState {
    url: string | null;
    image: HTMLImageElement | null;
    width: number;
    height: number;
}

// Global state - these will be shared across components:
// Image State
const imageState = reactive<ImageState>({
    url: null,
    image: null,
    width: -1,
    height: -1,
});

// Composables
export function useImageState() {
    return {
        imageState: readonly(imageState),
        setImage: (image: HTMLImageElement, url: string) => {
            imageState.image = image;
            imageState.url = url;
            imageState.width = image.width;
            imageState.height = image.height;
        },
        clearImage: () => {
            if (imageState.url) {
                URL.revokeObjectURL(imageState.url);
            }
            imageState.image = null;
            imageState.url = null;
            imageState.width = -1;
            imageState.height = -1;
        },
    };
}
