import type { Effect } from "../effects/Effect";

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
        console.log("WebGPURenderer: Starting initialize...");

        if (!navigator.gpu) {
            console.error("WebGPURenderer: WebGPU not supported");
            throw new Error("WebGPU is not supported");
        }

        console.log("WebGPURenderer: Requesting adapter...");
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            console.error("WebGPURenderer: No adapter found");
            throw new Error("No GPU adapter found");
        }

        console.log("WebGPURenderer: Requesting device...");
        this.device = await adapter.requestDevice();
        this.context = canvas.getContext("webgpu");

        if (!this.context) {
            console.error("WebGPURenderer: Failed to get WebGPU context");
            throw new Error("Failed to get WebGPU context");
        }

        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        console.log("WebGPURenderer: Canvas format:", this.canvasFormat);

        this.context.configure({
            device: this.device,
            format: this.canvasFormat,
            alphaMode: "premultiplied",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
        });

        console.log("WebGPURenderer: Initialize complete");
    }

    async loadImage(image: HTMLImageElement): Promise<void> {
        console.log(
            "WebGPURenderer: Loading image...",
            image.width,
            "x",
            image.height,
        );

        if (!this.device || !this.context) {
            console.error("WebGPURenderer: Not initialized");
            throw new Error("Renderer not initialized");
        }

        const canvas = this.context.canvas as HTMLCanvasElement;
        console.log(
            "WebGPURenderer: Setting canvas size to",
            image.width,
            "x",
            image.height,
        );
        canvas.width = image.width;
        canvas.height = image.height;

        // Clean up previous texture if it exists
        if (this.sourceTexture) {
            console.log("WebGPURenderer: Destroying previous texture");
            this.sourceTexture.destroy();
        }

        // Create texture from image
        console.log("WebGPURenderer: Creating image bitmap...");
        const imageBitmap = await createImageBitmap(image);

        console.log("WebGPURenderer: Creating texture...");
        this.sourceTexture = this.device.createTexture({
            size: [image.width, image.height],
            format: this.canvasFormat,
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.COPY_SRC |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        console.log("WebGPURenderer: Copying image to texture...");
        this.device.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: this.sourceTexture },
            [image.width, image.height],
        );

        console.log("WebGPURenderer: Rendering...");
        await this.render();
    }

    // async addEffect(
    //     effectId: AvailableEffectId,
    //     settings?: Record<string, any>,
    // ): Promise<string> {
    //     if (!this.device) throw new Error("Renderer not initialized");

    //     const effect = createEffect(this.device, effectId);
    //     await effect.initialize(this.canvasFormat);

    //     const id = `${effectId}-${Date.now()}`;
    //     const effectDefinition = effect.definition;

    //     this.effects.set(id, {
    //         id,
    //         effect,
    //         settings: { ...effectDefinition.defaultSettings, ...settings },
    //         enabled: true,
    //     });

    //     await this.render();
    //     return id;
    // }

    // async updateEffect(
    //     id: string,
    //     settings: Partial<Record<string, any>>,
    // ): Promise<void> {
    //     const activeEffect = this.effects.get(id);
    //     if (activeEffect) {
    //         Object.assign(activeEffect.settings, settings);
    //         await this.render();
    //     }
    // }

    // async toggleEffect(id: string): Promise<void> {
    //     const activeEffect = this.effects.get(id);
    //     if (activeEffect) {
    //         activeEffect.enabled = !activeEffect.enabled;
    //         await this.render();
    //     }
    // }

    // removeEffect(id: string): void {
    //     const activeEffect = this.effects.get(id);
    //     if (activeEffect) {
    //         activeEffect.effect.destroy();
    //         this.effects.delete(id);
    //         this.render();
    //     }
    // }

    private async render(): Promise<void> {
        console.log("WebGPURenderer: Starting render...");

        if (!this.device || !this.context || !this.sourceTexture) {
            console.log("WebGPURenderer: Missing required components:", {
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
            "WebGPURenderer: Number of enabled effects:",
            enabledEffects.length,
        );

        // If no effects, copy source directly to canvas
        if (enabledEffects.length === 0) {
            try {
                console.log(
                    "WebGPURenderer: Copying texture directly to canvas...",
                );
                const encoder = this.device.createCommandEncoder();
                encoder.copyTextureToTexture(
                    { texture: this.sourceTexture },
                    { texture: this.context.getCurrentTexture() },
                    [this.sourceTexture.width, this.sourceTexture.height],
                );
                this.device.queue.submit([encoder.finish()]);
                await this.device.queue.onSubmittedWorkDone();
                console.log("WebGPURenderer: Render complete");
            } catch (error) {
                console.error("WebGPURenderer: Failed to render image:", error);
                throw error;
            }
            return;
        }

        // // Create intermediate textures as needed
        // const intermediateTextures: GPUTexture[] = [];
        // for (let i = 0; i < enabledEffects.length - 1; i++) {
        //     intermediateTextures.push(
        //         this.device.createTexture({
        //             size: [this.sourceTexture.width, this.sourceTexture.height],
        //             format: this.canvasFormat,
        //             usage:
        //                 GPUTextureUsage.TEXTURE_BINDING |
        //                 GPUTextureUsage.RENDER_ATTACHMENT,
        //         }),
        //     );
        // }

        // // Apply effects in sequence
        // let currentInput = this.sourceTexture;
        // for (let i = 0; i < enabledEffects.length; i++) {
        //     const { effect, settings } = enabledEffects[i];
        //     const isLast = i === enabledEffects.length - 1;
        //     const output = isLast
        //         ? this.context.getCurrentTexture()
        //         : intermediateTextures[i];

        //     await effect.render(currentInput, output, settings);
        //     currentInput = output;
        // }

        // // Clean up intermediate textures
        // intermediateTextures.forEach((t) => t.destroy());
    }

    destroy(): void {
        this.effects.forEach(({ effect }) => effect.destroy());
        this.effects.clear();
        this.sourceTexture?.destroy();
        this.device?.destroy();
    }
}
