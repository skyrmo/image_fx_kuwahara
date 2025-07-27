import { Effect } from "./Effect";
import type { EffectDefinition } from "../types/effects";
import blurShader from "../shaders/blur.wgsl?raw";

export class BlurEffect extends Effect {
    static definition: EffectDefinition = {
        id: "blur",
        name: "Blur Effect",
        description: "Applies a blur effect to the image",
        shader: blurShader,
        defaultSettings: {
            radius: 2.0,
            enabled: true,
        },
        settingsConfig: {
            radius: {
                type: "range",
                label: "Blur Radius",
                min: 0.5,
                max: 5.0,
                step: 0.1,
            },
        },
    };

    constructor(device: GPUDevice) {
        super(device, BlurEffect.definition);
    }

    getUniformBufferSize(): number {
        return 16; // 4 bytes for radius + 12 bytes padding
    }

    updateUniforms(settings: Record<string, any>): void {
        console.log(
            "🔵 BlurEffect: updateUniforms called with settings:",
            settings,
        );
        const radius = settings.radius || 2.0;
        console.log("🔵 BlurEffect: Using radius:", radius);

        const data = new Float32Array(4);
        data[0] = radius;
        // data[1-3] are padding

        this.device.queue.writeBuffer(this.uniformBuffer!, 0, data);
        console.log("🔵 BlurEffect: Uniform buffer updated");
    }
}
