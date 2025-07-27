import { computed, watch, readonly } from "vue";
import { useWebGPU } from "./useWebGPU";
import { useSettingsState } from "./useAppState";
import { useWebGPUState } from "./useWebGPUState";

export function useEffects() {
    const { settingsState } = useSettingsState();
    const { addEffect, updateEffect, removeEffect } = useWebGPU();
    const { isInitialized } = useWebGPUState();

    // Simple tracking: effect type -> effect ID
    const activeEffects = new Map<string, string>();

    // STEP 1: Define what effects should be active based on settings
    const desiredEffects = computed(() => {
        const effects: Record<string, any> = {};

        // K-means effect
        if (settingsState.enableKMeans) {
            effects.kmeans = {
                numColors: settingsState.numColors,
            };
        }

        // Blur effect (example of adding more effects)
        if (settingsState.enableBlur) {
            effects.blur = {
                radius: settingsState.blurRadius,
            };
        }

        console.log("🎯 Desired effects computed:", effects);
        return effects;
    });

    // STEP 2: Compare desired vs actual and make changes
    const applyEffects = async () => {
        console.log("🚀 applyEffects called");
        console.log(
            "🔍 useEffects: isInitialized.value =",
            isInitialized.value,
        );

        if (!isInitialized.value) {
            console.log("❌ WebGPU not initialized yet, skipping effects");
            return;
        }

        const desired = desiredEffects.value;
        console.log("📋 Applying effects...");
        console.log("📝 Currently active:", Array.from(activeEffects.keys()));
        console.log("🎯 Want active:", Object.keys(desired));
        console.log("🔍 Desired settings:", desired);

        // STEP 2A: Remove effects that are no longer wanted
        for (const [effectType, effectId] of activeEffects.entries()) {
            if (!desired[effectType]) {
                console.log(`🗑️ Removing effect: ${effectType}`);
                removeEffect(effectId);
                activeEffects.delete(effectType);
            }
        }

        // STEP 2B: Add or update effects that are wanted
        for (const [effectType, settings] of Object.entries(desired)) {
            const existingId = activeEffects.get(effectType);

            if (existingId) {
                // Update existing effect
                console.log(`🔄 Updating effect: ${effectType}`, settings);
                await updateEffect(existingId, settings);
            } else {
                // Add new effect
                try {
                    console.log(`➕ Adding effect: ${effectType}`, settings);
                    const newId = await addEffect(effectType as any, settings);
                    activeEffects.set(effectType, newId);
                } catch (err) {
                    console.error(
                        `❌ Failed to add effect ${effectType}:`,
                        err,
                    );
                }
            }
        }

        console.log(
            "Effects applied. Currently active:",
            Array.from(activeEffects.keys()),
        );
    };

    // STEP 3: Watch for changes and apply them automatically
    watch(
        desiredEffects,
        (newEffects, oldEffects) => {
            console.log("👀 desiredEffects watcher triggered");
            console.log("🔄 Old effects:", oldEffects);
            console.log("🆕 New effects:", newEffects);
            applyEffects();
        },
        {
            deep: true,
            immediate: false, // Don't run immediately, wait for manual trigger
        },
    );

    return {
        applyEffects,
        desiredEffects: readonly(desiredEffects),
        // Expose for debugging
        activeEffectsDebug: () => Array.from(activeEffects.entries()),
    };
}
