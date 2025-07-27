<template>
    <main class="canvas-container">
        <canvas ref="canvasElement" class="canvas-wgpu" />
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useWebGPU } from "../composables/useWebGPU";
import { useImageState } from "../composables/useAppState";
import { useEffects } from "../composables/useEffects";

const { imageState } = useImageState();
const canvasElement = ref<HTMLCanvasElement>();
const { initialize, loadImage, isInitialized } = useWebGPU();
const { applyEffects, activeEffectsDebug } = useEffects();

onMounted(async () => {
    if (canvasElement.value) {
        console.log("🏗️ Canvas: Initializing WebGPU...");
        await initialize(canvasElement.value);
        console.log(
            "✅ Canvas: WebGPU initialized, isInitialized:",
            isInitialized.value,
        );

        // If an image is already loaded, load it and apply effects
        if (imageState.image && isInitialized.value) {
            try {
                console.log("📸 Canvas: Loading existing image...");
                await loadImage(imageState.image);
                console.log("🎨 Canvas: Applying initial effects...");
                await applyEffects();
                console.log(
                    "🔍 Canvas: Active effects after initial apply:",
                    activeEffectsDebug(),
                );
            } catch (err) {
                console.error("❌ Canvas: Failed to load existing image:", err);
            }
        }
    }
});

// Watch for new images
watch(
    () => imageState.image,
    async (newImage) => {
        console.log(
            "📷 Canvas: Image changed, newImage exists:",
            !!newImage,
            "isInitialized:",
            isInitialized.value,
        );
        if (newImage && isInitialized.value) {
            try {
                console.log("📸 Canvas: Loading new image...");
                await loadImage(newImage);
                console.log("🎨 Canvas: Applying effects to new image...");
                await applyEffects();
                console.log(
                    "🔍 Canvas: Active effects after new image:",
                    activeEffectsDebug(),
                );
            } catch (err) {
                console.error("❌ Canvas: Failed to load image:", err);
            }
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
