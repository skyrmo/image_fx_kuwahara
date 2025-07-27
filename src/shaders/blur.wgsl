struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f,
}

struct BlurSettings {
    radius: f32,
    _pad1: f32,
    _pad2: f32,
    _pad3: f32,
}

@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> settings: BlurSettings;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var pos = array<vec2f, 6>(
        vec2f(-1.0, -1.0),
        vec2f( 1.0, -1.0),
        vec2f(-1.0,  1.0),
        vec2f(-1.0,  1.0),
        vec2f( 1.0, -1.0),
        vec2f( 1.0,  1.0)
    );

    var texCoords = array<vec2f, 6>(
        vec2f(0.0, 1.0),
        vec2f(1.0, 1.0),
        vec2f(0.0, 0.0),
        vec2f(0.0, 0.0),
        vec2f(1.0, 1.0),
        vec2f(1.0, 0.0)
    );

    var output: VertexOutput;
    output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
    output.texCoord = texCoords[vertexIndex];
    return output;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
    // Very simple 3x3 blur to test if the effect works at all
    let texelSize = 1.0 / vec2f(textureDimensions(inputTexture));
    let blurAmount = settings.radius * 0.001; // Very small blur for testing

    var color = vec4f(0.0);

    // 3x3 kernel
    color += textureSample(inputTexture, textureSampler, texCoord + vec2f(-blurAmount, -blurAmount));
    color += textureSample(inputTexture, textureSampler, texCoord + vec2f(0.0, -blurAmount));
    color += textureSample(inputTexture, textureSampler, texCoord + vec2f(blurAmount, -blurAmount));

    color += textureSample(inputTexture, textureSampler, texCoord + vec2f(-blurAmount, 0.0));
    color += textureSample(inputTexture, textureSampler, texCoord); // center
    color += textureSample(inputTexture, textureSampler, texCoord + vec2f(blurAmount, 0.0));

    color += textureSample(inputTexture, textureSampler, texCoord + vec2f(-blurAmount, blurAmount));
    color += textureSample(inputTexture, textureSampler, texCoord + vec2f(0.0, blurAmount));
    color += textureSample(inputTexture, textureSampler, texCoord + vec2f(blurAmount, blurAmount));

    return color / 9.0;
}
