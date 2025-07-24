<template>
    <main class="canvas-container">
        <!-- <canvas ref="canvasWGPU" class="canvas-wgpu"></canvas> -->
        <img :src="imageState.url || undefined" alt="User selected image" />
    </main>
</template>

<script setup lang="ts">
// import { ref, onMounted, onUnmounted, watch } from "vue";
import { useImageState } from "../composables/useAppState";

const { imageState } = useImageState();

// const canvasWGPU = ref<HTMLCanvasElement>();
// const wgpuService = new WebGPUService();
// const { settingsState } = useSettingsState();
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
