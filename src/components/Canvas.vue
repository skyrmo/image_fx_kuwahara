<template>
    <main class="canvas-container">
        <div v-if="error" class="error-message">
            {{ error }}
        </div>
        <div v-else-if="isLoading" class="loading-message">Loading...</div>
        <canvas
            ref="canvasElement"
            class="canvas-wgpu"
            :class="{ 'canvas-ready': isInitialized }"
        />
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useWebGPU } from "../composables/useWebGPU";
import { useImageState } from "../composables/useAppState";

const canvasElement = ref<HTMLCanvasElement>();
const { isInitialized, isLoading, error, initialize, loadImage } = useWebGPU();
const { imageState } = useImageState();

onMounted(async () => {
    if (canvasElement.value) {
        await initialize(canvasElement.value);

        // If an image is already loaded in state, load it into WebGPU
        if (imageState.image && isInitialized.value) {
            try {
                // console.log("Canvas: Loading existing image after init...");
                await loadImage(imageState.image);
            } catch (err) {
                console.error("Canvas: Failed to load existing image:", err);
            }
        }
    }
});

// Watch for image changes and load them into WebGPU
watch(
    () => imageState.image,
    async (newImage) => {
        // console.log("Canvas: Image state changed:", {
        //     newImage: !!newImage,
        //     isInitialized: isInitialized.value,
        //     imageWidth: newImage?.width,
        //     imageHeight: newImage?.height,
        // });

        if (newImage && isInitialized.value) {
            try {
                // console.log("Canvas: Loading image into WebGPU...");
                await loadImage(newImage);
            } catch (err) {
                console.error("Canvas: Failed to load image:", err);
            }
        } else if (newImage && !isInitialized.value) {
            console.log(
                "Canvas: Image available but WebGPU not initialized yet",
            );
        }
    },
);
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
