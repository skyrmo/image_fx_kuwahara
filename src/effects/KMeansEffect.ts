import { Effect } from "./Effect";
import type { EffectDefinition } from "../types/effects";
import kmeansShader from "../shaders/kmeans.wgsl?raw";

export class KMeansEffect extends Effect {
    static definition: EffectDefinition = {
        id: "kmeans",
        name: "K-Means Color Quantization",
        description: "Reduces image colors using K-means clustering",
        shader: kmeansShader,
        defaultSettings: {
            numColors: 8,
            enabled: true,
        },
        settingsConfig: {
            numColors: {
                type: "range",
                label: "Number of Colors",
                min: 2,
                max: 16,
                step: 1,
            },
        },
    };

    constructor(device: GPUDevice) {
        super(device, KMeansEffect.definition);
    }

    getUniformBufferSize(): number {
        return 16; // 4 bytes for numColors + 12 bytes padding
    }

    updateUniforms(settings: Record<string, any>): void {
        const data = new Int32Array(4);
        data[0] = settings.numColors || 8;
        // data[1-3] are padding

        this.device.queue.writeBuffer(this.uniformBuffer!, 0, data);
    }
}
