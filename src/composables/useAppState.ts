import { reactive, readonly } from "vue";

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
        setLoading: (loading: boolean) => {
            appState.isLoading = loading;
        },
        setProcessing: (processing: boolean) => {
            appState.isProcessing = processing;
        },
        setError: (error: string | null) => {
            appState.error = error;
        },
        setWebGPUSupported: (supported: boolean) => {
            appState.webGPUSupported = supported;
        },
        setShowOriginal: (show: boolean) => {
            appState.showOriginal = show;
        },
    };
}
