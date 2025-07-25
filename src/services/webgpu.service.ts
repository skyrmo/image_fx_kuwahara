// Import Shaders as raw text
import kmeansShaderCode from "../shaders/kmeans.wgsl?raw";
import type { SettingsState } from "../composables/useAppState";

export class WebGPUService {
    private device: GPUDevice | null = null;
    private context: GPUCanvasContext | null = null;
    private canvasFormat: GPUTextureFormat = "bgra8unorm";

    // Textures
    private sourceTexture: GPUTexture | null = null;
    private outputTexture: GPUTexture | null = null;

    // Pipelines and resources
    private kmeansPipeline: GPURenderPipeline | null = null;
    private sampler: GPUSampler | null = null;
    private settingsBuffer: GPUBuffer | null = null;

    async initialize(canvas: HTMLCanvasElement): Promise<void> {
        if (!navigator.gpu) {
            throw new Error("WebGPU is not supported in this browser");
        }

        // Request adapter and device
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("No appropriate GPUAdapter found");
        }

        this.device = await adapter.requestDevice();

        // Set up canvas context
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

        await this.initializeResources();
    }

    private async initializeResources(): Promise<void> {
        if (!this.device) throw new Error("Device not initialized");

        // Create settings buffer
        this.settingsBuffer = this.device.createBuffer({
            size: 16, // 4 * 4 bytes for settings
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Create sampler
        this.sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
        });

        // Create render pipeline
        this.kmeansPipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.device.createShaderModule({
                    code: kmeansShaderCode,
                }),
                entryPoint: "vertexMain",
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: kmeansShaderCode,
                }),
                entryPoint: "fragmentMain",
                targets: [{ format: this.canvasFormat }],
            },
            primitive: {
                topology: "triangle-list",
            },
        });
    }

    async loadImage(image: HTMLImageElement): Promise<void> {
        if (!this.device || !this.context) {
            throw new Error("WebGPU not initialized");
        }

        const canvas = this.context.canvas as HTMLCanvasElement;
        canvas.width = image.width;
        canvas.height = image.height;

        // Create source texture from image
        const imageBitmap = await createImageBitmap(image);

        this.sourceTexture = this.device.createTexture({
            size: [image.width, image.height],
            format: this.canvasFormat,
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.device.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: this.sourceTexture },
            [image.width, image.height],
        );

        // Initial render
        await this.render();
    }

    async updateSettings(settings: SettingsState): Promise<void> {
        if (!this.device || !this.settingsBuffer) {
            throw new Error("WebGPU not initialized");
        }

        // Update settings buffer
        const settingsData = new ArrayBuffer(16);
        const settingsView = new Int32Array(settingsData);
        settingsView[0] = settings.numColors;
        settingsView[1] = settings.enableKMeans ? 1 : 0;

        this.device.queue.writeBuffer(this.settingsBuffer, 0, settingsData);

        // Re-render with new settings
        if (this.sourceTexture) {
            await this.render();
        }
    }

    private async render(): Promise<void> {
        if (
            !this.device ||
            !this.context ||
            !this.sourceTexture ||
            !this.kmeansPipeline ||
            !this.sampler ||
            !this.settingsBuffer
        ) {
            return;
        }

        const bindGroup = this.device.createBindGroup({
            layout: this.kmeansPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.sampler },
                { binding: 1, resource: this.sourceTexture.createView() },
                { binding: 2, resource: { buffer: this.settingsBuffer } },
            ],
        });

        const commandEncoder = this.device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.context.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
        });

        renderPass.setPipeline(this.kmeansPipeline);
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(6); // Full-screen quad
        renderPass.end();

        this.device.queue.submit([commandEncoder.finish()]);
        await this.device.queue.onSubmittedWorkDone();
    }

    destroy(): void {
        this.sourceTexture?.destroy();
        this.outputTexture?.destroy();
        this.settingsBuffer?.destroy();

        this.sourceTexture = null;
        this.outputTexture = null;
        this.settingsBuffer = null;
        this.kmeansPipeline = null;
        this.sampler = null;

        this.device?.destroy();
        this.device = null;
        this.context = null;
    }
}
