<template>
    <div class="container">
        <Controls />
        <Canvas />
    </div>
</template>

<script setup lang="ts">
// import HelloWorld from "./components/HelloWorld.vue";
import Canvas from "./components/Canvas.vue";
import Controls from "./components/Controls.vue";
</script>

<style scoped>
.container {
    height: 100vh;
    display: flex;
}
</style>
