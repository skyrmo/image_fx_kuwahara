// Import Shaders as raw text
// import kuwaharaShaderCode from "../shaders/kuwahara.wgsl?raw";
// import structureTensorShaderCode from "../shaders/structure_tensor.wgsl?raw";
// import blurShaderCode from "../shaders/blur.wgsl?raw";
import kmeansShaderCode from "../shaders/kmeans.wgsl?raw";

import { useSettingsState } from "../composables/useAppState";

export class WebGPUService {
    // Public API - what components will use
    async initialize(canvas: HTMLCanvasElement): Promise<boolean>;
    async loadImage(image: HTMLImageElement): Promise<void>;
    async updateSettings(): Promise<void>;
    destroy(): void;

    // Rendering pipeline - clearer naming
    private async renderKuwahara(inputTexture: GPUTexture): Promise<void>;
    private async renderKuwaharaPass(
        inputTexture: GPUTexture,
        structureTensor: GPUTexture,
        output?: GPUTexture,
    ): Promise<void>;
    private async renderKMeansPass(
        inputTexture: GPUTexture,
        output?: GPUTexture,
    ): Promise<void>;
    private async renderBlurPass(
        input: GPUTexture,
        output: GPUTexture,
        horizontal: boolean,
    ): Promise<void>;
    private async renderStructureTensor(
        inputTexture: GPUTexture,
    ): Promise<void>;
    private async renderToCanvas(inputTexture: GPUTexture): Promise<void>;

    // Resource management
    private createRenderTextures(image: HTMLImageElement): Promise<void>;
    private initializeRenderPipelines(): void;
}
