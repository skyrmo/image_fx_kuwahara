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
