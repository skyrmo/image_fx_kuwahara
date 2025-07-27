import { ref, watch, readonly } from "vue";
import { useSettingsState, useImageState } from "./useAppState";
import blurShader from "../shaders/blur.wgsl?raw";
import kmeansShader from "../shaders/kmeans.wgsl?raw";

// Simple effect definitions - just what we need
const EFFECTS = {
    blur: {
        shader: blurShader,
        getUniforms: (settings: any) =>
            new Float32Array([settings.blurRadius, 0, 0, 0]),
    },
    kmeans: {
        shader: kmeansShader,
        getUniforms: (settings: any) =>
            new Int32Array([settings.numColors, 0, 0, 0]),
    },
} as const;

export function useWebGPU() {
    const { settingsState } = useSettingsState();
    const { imageState } = useImageState();

    const isInitialized = ref(false);
    const canvas = ref<HTMLCanvasElement>();

    // WebGPU resources
    let device: GPUDevice | null = null;
    let context: GPUCanvasContext | null = null;
    let sourceTexture: GPUTexture | null = null;
    let pipelines: Map<string, GPURenderPipeline> = new Map();
    let uniformBuffers: Map<string, GPUBuffer> = new Map();
    let sampler: GPUSampler | null = null;
    let canvasFormat: GPUTextureFormat = "bgra8unorm";

    const initialize = async (canvasElement: HTMLCanvasElement) => {
        try {
            canvas.value = canvasElement;

            if (!navigator.gpu) {
                throw new Error("WebGPU is not supported");
            }

            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                throw new Error("No GPU adapter found");
            }

            device = await adapter.requestDevice();
            context = canvasElement.getContext("webgpu");

            if (!context) {
                throw new Error("Failed to get WebGPU context");
            }

            canvasFormat = navigator.gpu.getPreferredCanvasFormat();
            context.configure({
                device,
                format: canvasFormat,
                alphaMode: "premultiplied",
                usage:
                    GPUTextureUsage.RENDER_ATTACHMENT |
                    GPUTextureUsage.COPY_DST,
            });

            // Create sampler
            sampler = device.createSampler({
                magFilter: "linear",
                minFilter: "linear",
            });

            // Create pipelines for each effect
            for (const [name, effect] of Object.entries(EFFECTS)) {
                const shaderModule = device.createShaderModule({
                    code: effect.shader,
                    label: `${name}-shader`,
                });

                const pipeline = device.createRenderPipeline({
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
                    primitive: { topology: "triangle-list" },
                });

                pipelines.set(name, pipeline);

                // Create uniform buffer
                const uniformBuffer = device.createBuffer({
                    size: 16, // 4 floats/ints with padding
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });
                uniformBuffers.set(name, uniformBuffer);
            }

            isInitialized.value = true;
        } catch (error) {
            console.error("WebGPU initialization failed:", error);
            throw error;
        }
    };

    const loadImage = async (image: HTMLImageElement) => {
        if (!device || !context) {
            console.warn("WebGPU not initialized");
            return;
        }

        try {
            canvas.value!.width = image.width;
            canvas.value!.height = image.height;

            // Clean up previous texture
            if (sourceTexture) {
                sourceTexture.destroy();
            }

            const imageBitmap = await createImageBitmap(image);

            sourceTexture = device.createTexture({
                size: [image.width, image.height],
                format: canvasFormat,
                usage:
                    GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.COPY_SRC |
                    GPUTextureUsage.RENDER_ATTACHMENT,
            });

            device.queue.copyExternalImageToTexture(
                { source: imageBitmap },
                { texture: sourceTexture },
                [image.width, image.height],
            );

            render();
        } catch (error) {
            console.error("Failed to load image:", error);
            throw error;
        }
    };

    const render = () => {
        if (!device || !context || !sourceTexture || !sampler) {
            console.warn("Cannot render: missing WebGPU resources");
            return;
        }

        try {
            // Determine which effects to apply
            const activeEffects: Array<{ name: string; settings: any }> = [];

            if (settingsState.enableBlur) {
                activeEffects.push({
                    name: "blur",
                    settings: { blurRadius: settingsState.blurRadius },
                });
            }

            if (settingsState.enableKMeans) {
                activeEffects.push({
                    name: "kmeans",
                    settings: { numColors: settingsState.numColors },
                });
            }

            if (activeEffects.length === 0) {
                const encoder = device.createCommandEncoder();
                encoder.copyTextureToTexture(
                    { texture: sourceTexture },
                    { texture: context.getCurrentTexture() },
                    [sourceTexture.width, sourceTexture.height],
                );
                device.queue.submit([encoder.finish()]);
                return;
            }

            // Apply effects in sequence
            let currentInput = sourceTexture;

            for (let i = 0; i < activeEffects.length; i++) {
                const { name, settings } = activeEffects[i];
                const isLast = i === activeEffects.length - 1;

                const pipeline = pipelines.get(name)!;
                const uniformBuffer = uniformBuffers.get(name)!;
                const effect = EFFECTS[name as keyof typeof EFFECTS];

                // Update uniforms
                device.queue.writeBuffer(
                    uniformBuffer,
                    0,
                    effect.getUniforms(settings),
                );

                // Create output texture (or use canvas for last effect)
                const output = isLast
                    ? context.getCurrentTexture()
                    : device.createTexture({
                          size: [sourceTexture.width, sourceTexture.height],
                          format: canvasFormat,
                          usage:
                              GPUTextureUsage.TEXTURE_BINDING |
                              GPUTextureUsage.RENDER_ATTACHMENT,
                      });

                // Create bind group
                const bindGroup = device.createBindGroup({
                    layout: pipeline.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: sampler },
                        { binding: 1, resource: currentInput.createView() },
                        { binding: 2, resource: { buffer: uniformBuffer } },
                    ],
                });

                // Render
                const encoder = device.createCommandEncoder();
                const pass = encoder.beginRenderPass({
                    colorAttachments: [
                        {
                            view: output.createView(),
                            clearValue: { r: 0, g: 0, b: 0, a: 1 },
                            loadOp: "clear",
                            storeOp: "store",
                        },
                    ],
                });

                pass.setPipeline(pipeline);
                pass.setBindGroup(0, bindGroup);
                pass.draw(6);
                pass.end();

                device.queue.submit([encoder.finish()]);

                // Clean up intermediate texture
                if (currentInput !== sourceTexture) {
                    currentInput.destroy();
                }
                currentInput = output;
            }
        } catch (error) {
            console.error("Render failed:", error);
        }
    };

    // Watch for changes and re-render
    watch(
        () => [
            settingsState.enableBlur,
            settingsState.blurRadius,
            settingsState.enableKMeans,
            settingsState.numColors,
        ],
        () => {
            render();
        },
        { deep: true },
    );

    // Watch for image changes
    watch(
        () => imageState.image,
        (image) => {
            if (image && isInitialized.value) {
                loadImage(image);
            }
        },
    );

    const destroy = () => {
        console.log("🧹 Cleaning up WebGPU resources");
        sourceTexture?.destroy();
        uniformBuffers.forEach((buffer) => buffer.destroy());
        device?.destroy();

        sourceTexture = null;
        device = null;
        context = null;
        pipelines.clear();
        uniformBuffers.clear();
        sampler = null;
    };

    return {
        isInitialized: readonly(isInitialized),
        initialize,
        loadImage,
        render,
        destroy,
    };
}
