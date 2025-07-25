<template>
    <main class="canvas-container">
        <canvas ref="canvasWGPU" class="canvas-wgpu"></canvas>
        <!-- <img :src="imageState.url || undefined" alt="User selected image" /> -->
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
    /* border: solid 1px red; */
}
</style>
