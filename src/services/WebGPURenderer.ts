import type { Effect } from "../effects/Effect";
import { createEffect } from "./EffectManager";
import type { AvailableEffectId } from "./EffectManager";

export interface ActiveEffect {
    id: string;
    effect: Effect;
    settings: Record<string, any>;
    enabled: boolean;
}

export class WebGPURenderer {
    private device: GPUDevice | null = null;
    private context: GPUCanvasContext | null = null;
    private canvasFormat: GPUTextureFormat = "bgra8unorm";

    private sourceTexture: GPUTexture | null = null;
    private effects: Map<string, ActiveEffect> = new Map();

    async initialize(canvas: HTMLCanvasElement): Promise<void> {
        if (!navigator.gpu) {
            throw new Error("WebGPU is not supported");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("No GPU adapter found");
        }

        this.device = await adapter.requestDevice();
        this.context = canvas.getContext("webgpu");

        if (!this.context) {
            throw new Error("Failed to get WebGPU context");
        }

        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();

        this.context.configure({
            device: this.device,
            format: this.canvasFormat,
            alphaMode: "premultiplied",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
        });
    }

    async loadImage(image: HTMLImageElement): Promise<void> {
        if (!this.device || !this.context) {
            throw new Error("Renderer not initialized");
        }

        const canvas = this.context.canvas as HTMLCanvasElement;

        canvas.width = image.width;
        canvas.height = image.height;

        // Clean up previous texture if it exists
        if (this.sourceTexture) {
            this.sourceTexture.destroy();
        }

        // Create texture from image
        const imageBitmap = await createImageBitmap(image);

        this.sourceTexture = this.device.createTexture({
            size: [image.width, image.height],
            format: this.canvasFormat,
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.COPY_SRC |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.device.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: this.sourceTexture },
            [image.width, image.height],
        );

        await this.render();
    }

    async addEffect(
        effectId: AvailableEffectId,
        settings?: Record<string, any>,
    ): Promise<string> {
        console.log(`🎨 WebGPURenderer: Adding effect ${effectId}`, settings);
        if (!this.device) throw new Error("Renderer not initialized");

        const effect = createEffect(this.device, effectId);
        await effect.initialize(this.canvasFormat);

        const id = `${effectId}-${Date.now()}`;
        const effectDefinition = effect.definition;

        this.effects.set(id, {
            id,
            effect,
            settings: { ...effectDefinition.defaultSettings, ...settings },
            enabled: true,
        });

        console.log(
            `✅ WebGPURenderer: Effect ${effectId} added with ID ${id}`,
        );
        console.log(`📊 WebGPURenderer: Total effects: ${this.effects.size}`);
        await this.render();
        return id;
    }

    async updateEffect(
        id: string,
        settings: Partial<Record<string, any>>,
    ): Promise<void> {
        console.log(`🔄 WebGPURenderer: Updating effect ${id}`, settings);
        const activeEffect = this.effects.get(id);
        if (activeEffect) {
            Object.assign(activeEffect.settings, settings);
            console.log(`✅ WebGPURenderer: Effect ${id} updated`);
            await this.render();
        } else {
            console.warn(
                `⚠️ WebGPURenderer: Effect ${id} not found for update`,
            );
        }
    }

    removeEffect(id: string): void {
        console.log(`🗑️ WebGPURenderer: Removing effect ${id}`);
        const activeEffect = this.effects.get(id);
        if (activeEffect) {
            activeEffect.effect.destroy();
            this.effects.delete(id);
            console.log(`✅ WebGPURenderer: Effect ${id} removed`);
            console.log(
                `📊 WebGPURenderer: Total effects: ${this.effects.size}`,
            );
            this.render();
        } else {
            console.warn(
                `⚠️ WebGPURenderer: Effect ${id} not found for removal`,
            );
        }
    }

    private async render(): Promise<void> {
        console.log("🎬 WebGPURenderer: Starting render");
        if (!this.device || !this.context || !this.sourceTexture) {
            console.log("❌ WebGPURenderer: Missing required components:", {
                device: !!this.device,
                context: !!this.context,
                sourceTexture: !!this.sourceTexture,
            });
            return;
        }

        const enabledEffects = Array.from(this.effects.values()).filter(
            (e) => e.enabled,
        );
        console.log(
            `🎯 WebGPURenderer: Found ${enabledEffects.length} enabled effects`,
        );
        enabledEffects.forEach((effect, index) => {
            console.log(
                `  ${index + 1}. ${effect.effect.definition.id} (${effect.id})`,
                effect.settings,
            );
        });

        // If no effects, copy source directly to canvas
        if (enabledEffects.length === 0) {
            console.log(
                "📋 WebGPURenderer: No effects enabled, copying source directly to canvas",
            );
            try {
                const encoder = this.device.createCommandEncoder();
                encoder.copyTextureToTexture(
                    { texture: this.sourceTexture },
                    { texture: this.context.getCurrentTexture() },
                    [this.sourceTexture.width, this.sourceTexture.height],
                );
                this.device.queue.submit([encoder.finish()]);
                await this.device.queue.onSubmittedWorkDone();
                console.log("✅ WebGPURenderer: Direct copy render complete");
            } catch (error) {
                console.error(
                    "❌ WebGPURenderer: Failed to render image:",
                    error,
                );
                throw error;
            }
            return;
        }

        // Create intermediate textures as needed
        console.log(
            `🛠️ WebGPURenderer: Creating ${enabledEffects.length - 1} intermediate textures`,
        );
        const intermediateTextures: GPUTexture[] = [];
        for (let i = 0; i < enabledEffects.length - 1; i++) {
            intermediateTextures.push(
                this.device.createTexture({
                    size: [this.sourceTexture.width, this.sourceTexture.height],
                    format: this.canvasFormat,
                    usage:
                        GPUTextureUsage.TEXTURE_BINDING |
                        GPUTextureUsage.RENDER_ATTACHMENT,
                }),
            );
        }

        // Apply effects in sequence
        console.log("🔄 WebGPURenderer: Applying effects in sequence");
        let currentInput = this.sourceTexture;
        for (let i = 0; i < enabledEffects.length; i++) {
            const { effect, settings } = enabledEffects[i];
            const isLast = i === enabledEffects.length - 1;
            const output = isLast
                ? this.context.getCurrentTexture()
                : intermediateTextures[i];

            console.log(
                `  🎨 Step ${i + 1}: Applying ${effect.definition.id}`,
                settings,
            );
            console.log(
                `    Input: ${currentInput === this.sourceTexture ? "source texture" : "intermediate texture"}`,
            );
            console.log(
                `    Output: ${isLast ? "canvas" : "intermediate texture"}`,
            );

            try {
                await effect.render(currentInput, output, settings);
                console.log(
                    `    ✅ Effect ${effect.definition.id} applied successfully`,
                );
            } catch (error) {
                console.error(
                    `    ❌ Effect ${effect.definition.id} failed:`,
                    error,
                );
                throw error;
            }
            currentInput = output;
        }

        // Clean up intermediate textures
        console.log("🧹 WebGPURenderer: Cleaning up intermediate textures");
        intermediateTextures.forEach((t) => t.destroy());
        console.log("✅ WebGPURenderer: Effect pipeline render complete");
    }

    destroy(): void {
        this.effects.forEach(({ effect }) => effect.destroy());
        this.effects.clear();
        this.sourceTexture?.destroy();
        this.device?.destroy();
    }
}
