import type { EffectDefinition } from "../types/effects";

export abstract class Effect {
    protected device: GPUDevice;
    protected pipeline: GPURenderPipeline | null = null;
    protected uniformBuffer: GPUBuffer | null = null;
    protected sampler: GPUSampler | null = null;

    public readonly definition: EffectDefinition;

    constructor(device: GPUDevice, definition: EffectDefinition) {
        this.device = device;
        this.definition = definition;
    }

    async initialize(canvasFormat: GPUTextureFormat): Promise<void> {
        // Create shader module
        const shaderModule = this.device.createShaderModule({
            code: this.definition.shader,
            label: `${this.definition.id}-shader`,
        });

        // Create pipeline
        this.pipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: shaderModule,
                entryPoint: "vertexMain",
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragmentMain",
                targets: [{ format: canvasFormat }],
            },
            primitive: {
                topology: "triangle-list",
            },
        });

        // Create uniform buffer
        this.uniformBuffer = this.device.createBuffer({
            size: this.getUniformBufferSize(),
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Create sampler
        this.sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });
    }

    async render(
        inputTexture: GPUTexture,
        outputTexture: GPUTexture,
        settings: Record<string, any>,
    ): Promise<void> {
        if (!this.pipeline || !this.uniformBuffer || !this.sampler) {
            throw new Error(`Effect ${this.definition.id} not initialized`);
        }

        // Update uniforms
        this.updateUniforms(settings);

        // Create bind group
        const bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.sampler },
                { binding: 1, resource: inputTexture.createView() },
                { binding: 2, resource: { buffer: this.uniformBuffer } },
            ],
        });

        // Render
        const encoder = this.device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: outputTexture.createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
        });

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(6); // Full screen quad
        pass.end();

        this.device.queue.submit([encoder.finish()]);
    }

    abstract getUniformBufferSize(): number;
    abstract updateUniforms(settings: Record<string, any>): void;

    destroy(): void {
        this.uniformBuffer?.destroy();
        this.uniformBuffer = null;
        this.pipeline = null;
        this.sampler = null;
    }
}
