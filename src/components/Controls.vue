<template>
    <main>
        <div class="container">
            <!-- Image Upload Section -->
            <div class="upload-section">
                <h3>Image Upload</h3>
                <input ref="fileInput" type="file" accept="image/*" />
            </div>
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

        <div class="setting-group">
            <label class="checkbox-label">
                <input type="checkbox" />
                Enable K-means Color Quantization
            </label>
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
import { ref, onMounted, onUnmounted, watch } from "vue";
import {
    useSettingsState,
    useImageState,
    useAppState,
} from "../composables/useAppState";

// const canvasWGPU = ref<HTMLCanvasElement>();
// const wgpuService = new WebGPUService();

// const { imageState } = useImageState();
// const { settingsState } = useSettingsState();
</script>
