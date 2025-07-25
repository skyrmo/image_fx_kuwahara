<template>
    <main class="canvas-container">
        <canvas ref="canvasWGPU" class="canvas-wgpu"></canvas>
        <!-- <img :src="imageState.url || undefined" alt="User selected image" /> -->
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";
import { useImageState, useSettingsState } from "../composables/useAppState";
import { WebGPUService } from "../services/webgpu.service";

const { imageState } = useImageState();
const { settingsState } = useSettingsState();

const canvasWGPU = ref<HTMLCanvasElement>();
const wgpuService = new WebGPUService();

// Initialize WebGPU when canvas is mounted
onMounted(async () => {
    if (canvasWGPU.value) {
        await wgpuService.initialize(canvasWGPU.value);
    }
});

// Watch for image changes
watch(
    () => imageState.image,
    async (newImage) => {
        if (newImage) {
            await wgpuService.initImage(imageState.image!);
        }
    },
);

// Watch for settings changes
watch(
    settingsState,
    async () => {
        if (imageState.image) {
            // Use nextTick to handle async in watcher
            nextTick(async () => {
                await wgpuService.updateSettings();
            });
        }
    },
    { deep: true },
);
</script>

<style scoped>
.canvas-container {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: solid 1px red;
}
</style>
