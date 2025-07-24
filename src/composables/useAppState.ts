import { reactive, readonly } from "vue";

// Settings State Interface
export interface SettingsState {
    kernelSize: number;
    enableKMeans: boolean;
    numColors: number;
}

// Image State Interface
export interface ImageState {
    url: string | null;
    image: HTMLImageElement | null;
    width: number;
    height: number;
}

// Global state shared across components:

// Settings State
const settingsState = reactive<SettingsState>({
    kernelSize: 9,
    enableKMeans: false,
    numColors: 8,
});

// Image State
const imageState = reactive<ImageState>({
    url: null,
    image: null,
    width: -1,
    height: -1,
});

// Settings State Composable
export function useSettingsState() {
    return {
        settingsState,
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

// Image State Composable
export function useImageState() {
    return {
        imageState,
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
