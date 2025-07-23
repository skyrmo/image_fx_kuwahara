<template>
    <main>
        <div class="canvas-container">
            <canvas ref="canvasWGPU" class="canvas-wgpu"></canvas>
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

const canvasWGPU = ref<HTMLCanvasElement>();
// const wgpuService = new WebGPUService();

// const { imageState } = useImageState();
// const { settingsState } = useSettingsState();
</script>
