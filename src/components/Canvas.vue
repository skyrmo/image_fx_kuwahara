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
import { ref, onMounted } from "vue";
import { useWebGPU } from "../composables/useWebGPU";

const canvasElement = ref<HTMLCanvasElement>();
const { isInitialized, isLoading, error, initialize } = useWebGPU();

onMounted(async () => {
    if (canvasElement.value) {
        await initialize(canvasElement.value);
    }
});
</script>

<style scoped>
.canvas-container {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
