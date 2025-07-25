<template>
    <main class="controls-container">
        <div class="upload-section setting-group">
            <p>Image Upload</p>
            <input
                ref="fileInput"
                type="file"
                accept="image/*"
                @change="handleFileSelect"
            />
        </div>

        <div class="setting-group">
            <label class="checkbox-label">
                <input type="checkbox" v-model="settingsState.enableKMeans" />
                Enable K-means Color Quantization
            </label>
        </div>

        <!-- Number of colours controls -->
        <div class="setting-group">
            <label for="num-colors"> Number of Colors: </label>
            <input
                class="number-input"
                type="number"
                min="2"
                max="16"
                step="1"
                v-model.number="settingsState.numColors"
            />
            <input
                id="num-colors"
                type="range"
                min="2"
                max="16"
                step="1"
                v-model.number="settingsState.numColors"
            />
        </div>
    </main>
</template>

<script setup lang="ts">
import { useSettingsState, useImageState } from "../composables/useAppState";

const { setImage } = useImageState();
const { settingsState } = useSettingsState();

const handleFileSelect = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
        loadImage(file).catch(console.error);
    }
};

const loadImage = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);
        image.src = url;

        image.onload = () => {
            setImage(image, url);
            resolve();
        };

        image.onerror = (error) => {
            URL.revokeObjectURL(url);
            reject(error);
        };
    });
};
</script>

<style scoped>
.controls-container {
    border: solid 2px rgba(255, 255, 255, 0.25);
    flex: 0 0 auto;
    height: 100%;
}

.setting-group {
    border: solid 2px rgba(255, 255, 255, 0.5);
    border-radius: 0.5rem;
    padding: 0.5rem;
    margin: 0.5rem;
}
</style>
