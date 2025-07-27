<template>
    <main class="canvas-container">
        <canvas ref="canvasElement" class="canvas-wgpu" />
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useWebGPU } from "../composables/useWebGPU";
import { useImageState } from "../composables/useAppState";

const { imageState } = useImageState();
const canvasElement = ref<HTMLCanvasElement>();
const { initialize, loadImage, isInitialized, destroy } = useWebGPU();

onMounted(async () => {
    if (canvasElement.value) {
        try {
            // init the webgpu composable
            await initialize(canvasElement.value);

            // Load existing image - if present
            if (imageState.image && isInitialized.value) {
                await loadImage(imageState.image);
            }
        } catch (error) {
            console.error("❌ Canvas: Failed to initialize WebGPU:", error);
        }
    }
});

onUnmounted(() => {
    destroy();
});
</script>

<style scoped>
.canvas-container {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #1a1a1a;
    border: 2px solid rgba(255, 255, 255, 0.1);
}

.canvas-wgpu {
    max-width: 100%;
    max-height: 100%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background-color: #000;
}

.canvas-ready {
    background-color: transparent;
}

.error-message,
.loading-message {
    color: #fff;
    padding: 1rem;
    text-align: center;
    font-size: 1.1rem;
}

.error-message {
    color: #ff6b6b;
}

.loading-message {
    color: #4ecdc4;
}
</style>
