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

        <div class="setting-group">
            <label class="checkbox-label">
                <input type="checkbox" v-model="settingsState.enableBlur" />
                Enable Blur Effect
            </label>
        </div>

        <!-- K-means controls (only show when enabled) -->
        <div class="setting-group" v-if="settingsState.enableKMeans">
            <label for="num-colors">Number of Colors:</label>
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

        <!-- Blur controls (only show when enabled) -->
        <div class="setting-group" v-if="settingsState.enableBlur">
            <label for="blur-radius">Blur Radius:</label>
            <input
                id="blur-radius"
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                v-model.number="settingsState.blurRadius"
            />
            <span>{{ settingsState.blurRadius.toFixed(1) }}</span>
        </div>
    </main>
</template>

<script setup lang="ts">
import { useSettingsState, useImageState } from "../composables/useAppState";
import { watch } from "vue";

const { setImage } = useImageState();
const { settingsState } = useSettingsState();

// Debug settings changes
watch(
    () => settingsState.enableKMeans,
    (newVal, oldVal) => {
        console.log("🎛️ Controls: enableKMeans changed:", oldVal, "→", newVal);
    },
);

watch(
    () => settingsState.numColors,
    (newVal, oldVal) => {
        console.log("🎛️ Controls: numColors changed:", oldVal, "→", newVal);
    },
);

watch(
    () => settingsState.enableBlur,
    (newVal, oldVal) => {
        console.log("🎛️ Controls: enableBlur changed:", oldVal, "→", newVal);
    },
);

watch(
    () => settingsState.blurRadius,
    (newVal, oldVal) => {
        console.log("🎛️ Controls: blurRadius changed:", oldVal, "→", newVal);
    },
);

const handleFileSelect = (event: Event) => {
    // console.log("Controls: File selected");
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
        // console.log("Controls: File details:",
        //     {
        //     name: file.name,
        //     type: file.type,
        //     size: file.size,
        // });
        loadImage(file).catch((error) => {
            console.error("Controls: Error loading image:", error);
            // Reset file input
            input.value = "";
        });
    } else {
        console.log("Controls: No file selected");
    }
};

const loadImage = async (file: File): Promise<void> => {
    // console.log("Controls: Starting to load image file:", file.name);
    return new Promise((resolve, reject) => {
        // Validate file type
        if (!file.type.startsWith("image/")) {
            console.error("Controls: Invalid file type:", file.type);
            reject(new Error("Selected file is not an image"));
            return;
        }

        // console.log("Controls: Creating image element...");
        const image = new Image();
        const url = URL.createObjectURL(file);
        // console.log("Controls: Object URL created:", url);
        image.src = url;

        image.onload = () => {
            try {
                // console.log(
                //     `Controls: Image loaded successfully: ${image.width}x${image.height}`,
                // );
                setImage(image, url);
                // console.log("Controls: Image set in state");
                resolve();
            } catch (error) {
                console.error("Controls: Error setting image:", error);
                URL.revokeObjectURL(url);
                reject(error);
            }
        };

        image.onerror = (error) => {
            console.error("Controls: Failed to load image:", error);
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image file"));
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
