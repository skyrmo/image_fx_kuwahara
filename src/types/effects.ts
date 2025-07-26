export interface EffectDefinition {
    id: string;
    name: string;
    description: string;
    shader: string;
    defaultSettings: Record<string, any>;
    settingsConfig: SettingsConfig;
}

export interface SettingsConfig {
    [key: string]: {
        type: "range" | "toggle" | "select";
        label: string;
        min?: number;
        max?: number;
        step?: number;
        options?: Array<{ value: any; label: string }>;
    };
}

export interface EffectChain {
    effects: Array<{
        id: string;
        effectId: string;
        settings: Record<string, any>;
        enabled: boolean;
    }>;
}

export interface ShaderUniforms {
    [key: string]: number | boolean;
}
