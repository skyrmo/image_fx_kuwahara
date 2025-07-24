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
                <input type="checkbox" />
                Enable K-means Color Quantization
            </label>
        </div>

        <div class="setting-group">
            <label for="kernel-size">
                Kernel Size:
                <span class="value">{{ 16 }}</span>
            </label>
            <input id="kernel-size" type="range" min="3" max="200" step="2" />
            <input
                type="number"
                min="3"
                max="200"
                step="2"
                class="number-input"
            />
        </div>

        <!-- <div v-if="settings.enableKMeans" class="setting-group"> -->
        <div class="setting-group">
            <label for="num-colors">
                Number of Colors: <span class="value">{{ 8 }}</span>
            </label>
            <input id="num-colors" type="range" min="2" max="16" step="1" />
            <input
                class="number-input"
                type="number"
                min="2"
                max="16"
                step="1"
            />
        </div>
    </main>
</template>

<script setup lang="ts">
// import { ref, onMounted, onUnmounted, watch } from "vue";
import {
    // useSettingsState,
    useImageState,
    // useAppState,
} from "../composables/useAppState";

// const canvasWGPU = ref<HTMLCanvasElement>();
// const wgpuService = new WebGPUService();

const { setImage } = useImageState();
// const { settingsState } = useSettingsState();

const handleFileSelect = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
        loadImage(file).catch(console.error);
    }
};

const loadImage = async (file: File): Promise<void> => {
    try {
        // Validate file type
        if (!file.type.startsWith("image/")) {
            throw new Error("Please select a valid image file");
        }

        return new Promise((resolve, reject) => {
            const image = new Image();
            const url = URL.createObjectURL(file);
            image.src = url;

            image.onload = () => {
                setImage(image, url);
                console.log(image);
                resolve();
            };

            image.onerror = (error) => {
                URL.revokeObjectURL(url);
                reject(error);
            };
        });
    } catch (error) {
        throw error;
    }
};
</script>

<style scoped>
.controls-container {
    /* border: solid 2px rgba(255, 255, 255, 0.25); */
    border: solid 2px blue;
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
