struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f,
}

struct KMeansSettings {
    numColors: i32,
    _pad1: i32,
    _pad2: i32,
    _pad3: i32,
}

@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> settings: KMeansSettings;

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

// Hash function for pseudo-random number generation
fn hash31(p: vec3f) -> f32 {
    var p3 = fract(p * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

// Hash function for 2D input
fn hash21(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

// Sample colors from the entire image using random sampling
fn sampleImageColors(texCoord: vec2f, numSamples: i32) -> array<vec3f, 64> {
    var samples: array<vec3f, 64>;
    let texSize = vec2f(textureDimensions(inputTexture));

    // Sample randomly across the entire image
    for (var i = 0; i < numSamples && i < 64; i++) {
        let sampleCoord = vec2f(
            hash21(vec2f(texCoord.x * 1000.0 + f32(i), texCoord.y * 1000.0)),
            hash21(vec2f(texCoord.x * 1000.0 + f32(i + 100), texCoord.y * 1000.0 + f32(i + 200)))
        );

        samples[i] = textureSample(inputTexture, textureSampler, sampleCoord).rgb;
    }

    return samples;
}

// K-means++ initialization with better distribution
fn initializeCentroids(samples: array<vec3f, 64>, numSamples: i32, numCentroids: i32, texCoord: vec2f) -> array<vec3f, 16> {
    var centroids: array<vec3f, 16>;

    // Choose first centroid randomly
    let firstIndex = i32(hash21(texCoord) * f32(numSamples));
    centroids[0] = samples[firstIndex];

    // Choose remaining centroids using K-means++ method
    for (var c = 1; c < numCentroids; c++) {
        var maxDistance = 0.0;
        var bestIndex = 0;

        // Find sample with maximum distance to nearest centroid
        for (var s = 0; s < numSamples; s++) {
            var minDistToCentroid = 1000.0;

            for (var cc = 0; cc < c; cc++) {
                let diff = samples[s] - centroids[cc];
                let dist = dot(diff, diff);
                minDistToCentroid = min(minDistToCentroid, dist);
            }

            if (minDistToCentroid > maxDistance) {
                maxDistance = minDistToCentroid;
                bestIndex = s;
            }
        }

        centroids[c] = samples[bestIndex];
    }

    return centroids;
}

// Proper K-means++ initialization with probabilistic selection
fn initializeCentroidsProper(samples: array<vec3f, 64>, numSamples: i32, numCentroids: i32, texCoord: vec2f) -> array<vec3f, 16> {
    var centroids: array<vec3f, 16>;

    // Choose first centroid randomly
    let firstIndex = i32(hash21(texCoord) * f32(numSamples));
    centroids[0] = samples[firstIndex];

    // Choose remaining centroids using proper K-means++ probabilistic selection
    for (var c = 1; c < numCentroids; c++) {
        var distances: array<f32, 64>;
        var totalWeight = 0.0;

        // Calculate squared distances to nearest existing centroids
        for (var s = 0; s < numSamples; s++) {
            var minDistToCentroid = 3.0; // Max possible distance for RGB [0,1]

            for (var cc = 0; cc < c; cc++) {
                let diff = samples[s] - centroids[cc];
                let dist = dot(diff, diff);
                minDistToCentroid = min(minDistToCentroid, dist);
            }

            distances[s] = minDistToCentroid;
            totalWeight += minDistToCentroid;
        }

        // Probabilistic selection based on squared distances
        if (totalWeight > 0.0) {
            let threshold = hash21(vec2f(texCoord.x + f32(c), texCoord.y)) * totalWeight;
            var cumulativeWeight = 0.0;
            var selectedIndex = 0;

            for (var s = 0; s < numSamples; s++) {
                cumulativeWeight += distances[s];
                if (cumulativeWeight >= threshold) {
                    selectedIndex = s;
                    break;
                }
            }

            centroids[c] = samples[selectedIndex];
        } else {
            // Fallback to random selection if all distances are zero
            let randomIndex = i32(hash21(vec2f(texCoord.x + f32(c), texCoord.y + f32(c))) * f32(numSamples));
            centroids[c] = samples[randomIndex];
        }
    }

    return centroids;
}

// Perform K-means clustering
fn performKMeans(samples: array<vec3f, 64>, numSamples: i32, numCentroids: i32, texCoord: vec2f) -> array<vec3f, 16> {
    var centroids = initializeCentroids(samples, numSamples, numCentroids, texCoord);
    // var centroids = initializeCentroidsProper(samples, numSamples, numCentroids, texCoord);

    // Perform iterative refinement
    let maxIterations = 12;
    for (var iter = 0; iter < maxIterations; iter++) {
        var newCentroids: array<vec3f, 16>;
        var counts: array<f32, 16>;

        // Initialize
        for (var c = 0; c < numCentroids; c++) {
            newCentroids[c] = vec3f(0.0);
            counts[c] = 0.0;
        }

        // Assign samples to nearest centroids
        for (var s = 0; s < numSamples; s++) {
            var minDist = 1000.0;
            var nearestCentroid = 0;

            for (var c = 0; c < numCentroids; c++) {
                let diff = samples[s] - centroids[c];
                let dist = dot(diff, diff);
                if (dist < minDist) {
                    minDist = dist;
                    nearestCentroid = c;
                }
            }

            newCentroids[nearestCentroid] += samples[s];
            counts[nearestCentroid] += 1.0;
        }

        // Update centroids
        for (var c = 0; c < numCentroids; c++) {
            if (counts[c] > 0.0) {
                centroids[c] = newCentroids[c] / counts[c];
            }
        }
    }

    return centroids;
}

// Find nearest centroid to a color
fn findNearestCentroid(color: vec3f, centroids: array<vec3f, 16>, numCentroids: i32) -> vec3f {
    var minDist = 1000.0;
    var nearestColor = centroids[0];

    for (var c = 0; c < numCentroids; c++) {
        let diff = color - centroids[c];
        let dist = dot(diff, diff);
        if (dist < minDist) {
            minDist = dist;
            nearestColor = centroids[c];
        }
    }

    return nearestColor;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
    let originalColor = textureSample(inputTexture, textureSampler, texCoord).rgb;

    // Always use K-means clustering for all color counts
    let numSamples = min(64, max(16, settings.numColors * 4));

    let samples = sampleImageColors(texCoord, numSamples);

    // Perform K-means clustering on the sampled colors
    let centroids = performKMeans(samples, numSamples, settings.numColors, texCoord);

    // Find the nearest centroid to the original color
    let quantizedColor = findNearestCentroid(originalColor, centroids, settings.numColors);

    return vec4f(quantizedColor, 1.0);
}
