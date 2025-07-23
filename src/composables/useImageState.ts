import { reactive, readonly } from "vue";

// Image State
export interface ImageState {
    url: string | null;
    image: HTMLImageElement | null;
    width: number;
    height: number;
}

// Global state - these will be shared across components:
// Image State
const imageState = reactive<ImageState>({
    url: null,
    image: null,
    width: -1,
    height: -1,
});

// Composables
export function useImageState() {
    return {
        imageState: readonly(imageState),
        setImage: (image: HTMLImageElement, url: string) => {
            imageState.image = image;
            imageState.url = url;
            imageState.width = image.width;
            imageState.height = image.height;
        },
        clearImage: () => {
            if (imageState.url) {
                URL.revokeObjectURL(imageState.url);
            }
            imageState.image = null;
            imageState.url = null;
            imageState.width = -1;
            imageState.height = -1;
        },
    };
}
