// Import Shaders as raw text
import kmeansShaderCode from "../shaders/kmeans.wgsl?raw";
import { settingsState } from "../stores/state.svelte";

export class WebGPUService {
    private canvas: HTMLCanvasElement | null = null;
    private device: GPUDevice | null = null;
    private context: GPUCanvasContext | null = null;
    private canvasFormat: any = null;
    private currentTexture: GPUTexture | null = null;
    private settingsBuffer: GPUBuffer | null = null;

    private kmeansTexture: GPUTexture | null = null;

    private kmeansPipeline: GPURenderPipeline | null = null;
    private sampler: GPUSampler | null = null;
    private kmeansBuffer: GPUBuffer | null = null;

    // Clean up any other resources
    destroy() {
        this.kmeansPipeline = null;
        this.sampler = null;
        this.kmeansBuffer = null;

        if (this.device) {
            this.device.destroy();
        }
    }

    async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
        if (!navigator.gpu) {
            throw new Error("WebGPU not supported");
        }

        this.canvas = canvas;

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("No appropriate GPUAdapter found");
        }

        this.device = await adapter.requestDevice();
        this.context = canvas.getContext("webgpu") as GPUCanvasContext;

        if (!this.context) {
            throw new Error("Could not get WebGPU context");
        }

        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.canvasFormat,
            alphaMode: "premultiplied",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
        });

        this.settingsBuffer = this.device.createBuffer({
            size: 48, // Must match the total size of the shader structure
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.kmeansBuffer = this.device.createBuffer({
            size: 16, // numColors (i32) + 3 padding (i32)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Create cached sampler
        this.sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });

        // Initialize pipelines
        this.initializePipelines();

        this.updateSettings();

        return true;
    }

    private initializePipelines() {
        if (!this.device) return;

        // K-means pipeline
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

    async updateSettings() {
        if (!this.device || !this.settingsBuffer) {
            console.error("updateSettings: Missing device or settings buffer", {
                device: !!this.device,
                settingsBuffer: !!this.settingsBuffer,
            });
            return;
        }

        try {
            // Create buffer with the full size
            const settingsData = new ArrayBuffer(48);

            // Create views for different parts of the buffer
            const intView = new Int32Array(settingsData, 0, 4); // 4 integers (including padding)
            const floatView = new Float32Array(settingsData, 16, 8); // 8 floats (including padding)

            // Set integers
            intView[0] = settingsState.kernelSize;
            intView[1] = settingsState.n;
            intView[2] = 0; // padding
            intView[3] = 0; // padding

            // Set floats
            floatView[0] = settingsState.hardness;
            floatView[1] = settingsState.q;
            floatView[2] = settingsState.zeroCrossing;
            floatView[3] = settingsState.zeta;
            floatView[4] = settingsState.alpha;
            floatView[5] = 0.0; // padding
            floatView[6] = 0.0; // padding
            floatView[7] = 0.0; // padding

            this.device.queue.writeBuffer(this.settingsBuffer, 0, settingsData);

            // Update K-means buffer
            // console.log("updateSettings: Writing K-means buffer");
            const kmeansData = new ArrayBuffer(16);
            const kmeansView = new Int32Array(kmeansData);
            kmeansView[0] = settingsState.numColors;
            kmeansView[1] = 0; // padding
            kmeansView[2] = 0; // padding
            kmeansView[3] = 0; // padding
            this.device.queue.writeBuffer(this.kmeansBuffer!, 0, kmeansData);

            if (this.currentTexture) {
                await this.processKuwahara(this.currentTexture);
            } else {
                console.warn("updateSettings: No current texture available");
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            console.error("Stack trace:", (error as Error).stack);
            throw new Error(
                `Failed to update filter settings: ${(error as Error).message}`,
            );
        }
    }

    private async createTextures(image: HTMLImageElement) {
        if (!this.device) return;

        const width = image.width;
        const height = image.height;

        const imageBitmap = await createImageBitmap(image);

        this.currentTexture = this.device.createTexture({
            size: [width, height],
            format: this.canvasFormat,
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.COPY_SRC |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.device.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: this.currentTexture },
            [imageBitmap.width, imageBitmap.height],
        );

        // Create texture for K-means
        this.kmeansTexture = this.device.createTexture({
            size: [width, height],
            format: this.canvasFormat,
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.COPY_SRC,
        });
    }

    async initImage(image: HTMLImageElement) {
        if (!this.device || !this.context || !this.canvas) {
            throw new Error("WebGPU not initialized");
        }

        try {
            // Validate image dimensions
            if (image.width <= 0 || image.height <= 0) {
                throw new Error("Invalid image dimensions");
            }

            // Check if image is too large
            const maxDimension = 4096; // Reasonable limit
            if (image.width > maxDimension || image.height > maxDimension) {
                throw new Error(
                    `Image too large. Maximum dimension is ${maxDimension}px`,
                );
            }

            this.canvas.width = image.width;
            this.canvas.height = image.height;

            await this.createTextures(image);

            if (!this.currentTexture) {
                throw new Error("Failed to create texture from image");
            }

            await this.processKuwahara(this.currentTexture);
        } catch (error) {
            console.error("Error initializing image:", error);
            throw error instanceof Error
                ? error
                : new Error("Failed to initialize image");
        }
    }

    private async applyBlur(
        inputTexture: GPUTexture,
        outputTexture: GPUTexture,
        horizontal: boolean,
    ) {
        if (!this.device || !this.blurPipeline || !this.sampler) return;

        try {
            performance.mark(
                `blur-${horizontal ? "horizontal" : "vertical"}-start`,
            );

            // Create a uniform buffer for blur direction
            const directionBuffer = this.device.createBuffer({
                size: 4,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            // Set horizontal or vertical direction
            const direction = new Int32Array([horizontal ? 1 : 0]);
            this.device.queue.writeBuffer(directionBuffer, 0, direction);

            const bindGroup = this.device.createBindGroup({
                layout: this.blurPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: this.sampler },
                    { binding: 1, resource: inputTexture.createView() },
                    { binding: 2, resource: { buffer: directionBuffer } },
                ],
            });

            const commandEncoder = this.device.createCommandEncoder();
            const passEncoder = commandEncoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: outputTexture.createView(),
                        clearValue: { r: 0, g: 0, b: 0, a: 1 },
                        loadOp: "clear",
                        storeOp: "store",
                    },
                ],
            });

            passEncoder.setPipeline(this.blurPipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.draw(6);
            passEncoder.end();

            this.device.queue.submit([commandEncoder.finish()]);
            await this.device.queue.onSubmittedWorkDone();

            performance.mark(
                `blur-${horizontal ? "horizontal" : "vertical"}-end`,
            );
            performance.measure(
                `blur-${horizontal ? "horizontal" : "vertical"}`,
                `blur-${horizontal ? "horizontal" : "vertical"}-start`,
                `blur-${horizontal ? "horizontal" : "vertical"}-end`,
            );
        } catch (error) {
            console.error(
                `Error applying ${horizontal ? "horizontal" : "vertical"} blur:`,
                error,
            );
            throw new Error(
                `Failed to apply ${horizontal ? "horizontal" : "vertical"} blur`,
            );
        }
    }

    private async calculateStructureTensor(inputTexture: GPUTexture) {
        if (
            !this.device ||
            !this.structureTensorTexture ||
            !this.structureTensorPipeline ||
            !this.sampler
        )
            return;

        try {
            performance.mark("structure-tensor-start");

            const bindGroup = this.device.createBindGroup({
                layout: this.structureTensorPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: this.sampler },
                    { binding: 1, resource: inputTexture.createView() },
                ],
            });

            const commandEncoder = this.device.createCommandEncoder();
            const passEncoder = commandEncoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: this.structureTensorTexture.createView(),
                        clearValue: { r: 0, g: 0, b: 0, a: 1 },
                        loadOp: "clear",
                        storeOp: "store",
                    },
                ],
            });

            passEncoder.setPipeline(this.structureTensorPipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.draw(6);
            passEncoder.end();

            this.device.queue.submit([commandEncoder.finish()]);
            await this.device.queue.onSubmittedWorkDone();

            performance.mark("structure-tensor-end");
            performance.measure(
                "structure-tensor",
                "structure-tensor-start",
                "structure-tensor-end",
            );
        } catch (error) {
            console.error("Error calculating structure tensor:", error);
            throw new Error("Failed to calculate structure tensor");
        }
    }

    private async processKuwahara(inputTexture: GPUTexture) {
        if (!this.device || !this.context || !this.settingsBuffer) return;

        try {
            await this.applyKMeans(inputTexture, this.kmeansTexture!);
        } catch (error) {
            console.error("Error processing Kmeans filter:", error);
            throw new Error("Failed to process Kmeans filter");
        }
    }

    // Apply K-means color quantization
    private async applyKMeans(
        inputTexture: GPUTexture,
        outputTexture?: GPUTexture,
    ) {
        if (
            !this.device ||
            !this.kmeansPipeline ||
            !this.kmeansTexture ||
            !this.kmeansBuffer ||
            !this.sampler
        )
            return;

        try {
            const bindGroup = this.device.createBindGroup({
                layout: this.kmeansPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: this.sampler },
                    { binding: 1, resource: inputTexture.createView() },
                    { binding: 2, resource: { buffer: this.kmeansBuffer } },
                ],
            });

            const commandEncoder = this.device.createCommandEncoder();
            const passEncoder = commandEncoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: (
                            outputTexture || this.context!.getCurrentTexture()
                        ).createView(),
                        clearValue: { r: 0, g: 0, b: 0, a: 1 },
                        loadOp: "clear",
                        storeOp: "store",
                    },
                ],
            });

            passEncoder.setPipeline(this.kmeansPipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.draw(6);
            passEncoder.end();

            this.device.queue.submit([commandEncoder.finish()]);
            await this.device.queue.onSubmittedWorkDone();
        } catch (error) {
            console.error("Error applying K-means:", error);
            throw new Error("Failed to apply K-means quantization");
        }
    }

    // // Copy texture directly to canvas (no processing)
    // private async copyToCanvas(inputTexture: GPUTexture) {
    //     if (!this.device || !this.context) return;

    //     try {
    //         const commandEncoder = this.device.createCommandEncoder();
    //         commandEncoder.copyTextureToTexture(
    //             { texture: inputTexture },
    //             { texture: this.context.getCurrentTexture() },
    //             [this.canvas?.width || 0, this.canvas?.height || 0],
    //         );
    //         this.device.queue.submit([commandEncoder.finish()]);
    //         await this.device.queue.onSubmittedWorkDone();
    //     } catch (error) {
    //         console.error("Error copying to canvas:", error);
    //         throw new Error("Failed to copy image to canvas");
    //     }
    // }
}
