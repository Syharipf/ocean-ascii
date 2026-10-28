import QtQuick
import "engine.mjs" as Engine

Item {
    id: ocean
    clip: true

    property string sharkKind: "all"
    property bool showRain: true
    property bool showWaves: true
    property bool showClouds: true
    property bool mouseInteraction: true
    property int fps: 30
    property bool pauseOnAppOpen: true
    property bool running: true
    property double speed: 1.0

    // Preview overrides
    property string previewPhase: "auto"
    property string previewWeather: "auto"
    onPreviewPhaseChanged: advanceFrame(0.001)
    onPreviewWeatherChanged: advanceFrame(0.001)

    readonly property int targetFps: Math.max(15, Math.min(60, fps))
    property bool hasVisibleWindows: false
    readonly property bool animating: running && visible && width > 0 && height > 0
                                      && (!pauseOnAppOpen || !hasVisibleWindows)

    property var engine: null
    property int frameSerial: 0
    property double lastUpdateMs: 0
    property int qualityLevel: 0

    // Evaluation window for qualityLevel (every 5s active)
    property var updateCosts: []
    property double lastQualityCheckMs: 0
    property double lowCostDuration: 0

    // Palette & Phase state from engine.frame
    property var environmentState: null
    property var currentPalette: null
    property real currentLight: 1.0
    property int fishCount: 0
    property real currentRainIntensity: 0
    property real currentSnowIntensity: 0
    property int rainDropCount: 0
    property int rippleCount: 0
    property int snowFlakeCount: 0
    property var animalSlots: []
    onSharkKindChanged: if (engine) engine.setSharkKind(sharkKind)
    onShowCloudsChanged: if (engine) engine.setShowClouds(showClouds)
    onShowRainChanged: if (engine) engine.setShowRain(showRain)
    onShowWavesChanged: if (engine) engine.setShowWaves(showWaves)
    onMouseInteractionChanged: if (engine) {
        engine.mouseInteraction = mouseInteraction;
        if (!mouseInteraction) engine.onPointerLeave();
    }
    onWidthChanged: resizeScene.restart()
    onHeightChanged: resizeScene.restart()

    onAnimatingChanged: {
        lastFrameTime = 0;
        frameAccumulator = 0;
        if (engine) {
            engine.resetStep();
            engine.onPointerLeave();
        }
    }

    Component.onCompleted: {
        engine = new Engine.OceanEngine({
            sharkKind: sharkKind,
            showRain: showRain,
            showWaves: showWaves,
            showClouds: showClouds,
            mouseInteraction: mouseInteraction
        });
        resizeScene.restart();
    }

    Timer {
        id: resizeScene
        interval: 0
        onTriggered: if (ocean.engine && ocean.width > 0 && ocean.height > 0) {
            ocean.engine.resize(ocean.width, ocean.height);
            ocean.fishCount = ocean.engine.world.fish.length;
            ocean.lastFrameTime = 0;
            ocean.frameAccumulator = 0;
            ocean.advanceFrame(0.001);
        }
    }
    // Deep ocean base: natural oceanic tones without harsh one-sided gradients
    Rectangle {
        id: bgSea
        anchors.fill: parent
        gradient: Gradient {
            GradientStop { position: 0.0; color: ocean.currentPalette && ocean.currentPalette.seaGrad ? ocean.currentPalette.seaGrad : "#204e57" }
            GradientStop { position: 0.55; color: ocean.currentPalette ? ocean.currentPalette.sea : "#0e3846" }
            GradientStop { position: 1.0; color: ocean.currentPalette && ocean.currentPalette.sea ? ocean.currentPalette.sea : "#0e3846" }
        }
    }

    // Soft radial caustics & sunlight diffusion across the ocean surface (natural overhead POV)
    Rectangle {
        id: ambientLightDiffuser
        anchors.centerIn: parent
        width: Math.max(parent.width, parent.height) * 1.5
        height: width
        radius: width * 0.5
        gradient: Gradient {
            GradientStop {
                position: 0.0
                color: ocean.currentPalette && ocean.currentPalette.caustics ? ocean.currentPalette.caustics : "#6ed8e8"
            }
            GradientStop {
                position: 0.45
                color: ocean.currentPalette && ocean.currentPalette.seaGrad ? ocean.currentPalette.seaGrad : "#164d5c"
            }
            GradientStop {
                position: 1.0
                color: "transparent"
            }
        }
        opacity: 0.22
    }

    // Soft natural peripheral ocean depth vignette (deep waters at boundaries)
    Rectangle {
        anchors.fill: parent
        gradient: Gradient {
            GradientStop { position: 0.0; color: "transparent" }
            GradientStop { position: 0.8; color: "transparent" }
            GradientStop { position: 1.0; color: "#02070e" }
        }
        opacity: 0.4
    }
    // Dim background grid
    Item {
        id: gridContainer
        anchors.fill: parent
        readonly property real cw: ocean.engine ? ocean.engine.cellWidth : 12
        readonly property real ch: ocean.engine ? ocean.engine.cellHeight : 18
        readonly property int cols: cw > 0 ? Math.ceil(width / cw) : 0
        readonly property int rows: ch > 0 ? Math.ceil(height / ch) : 0

        Repeater {
            model: gridContainer.cols
            Rectangle {
                required property int index
                x: Math.round(index * gridContainer.cw)
                y: 0
                width: 1
                height: gridContainer.height
                color: ocean.currentPalette ? ocean.currentPalette.grid : "#294956"
                opacity: 0.35
            }
        }
        Repeater {
            model: gridContainer.rows
            Rectangle {
                required property int index
                x: 0
                y: Math.round(index * gridContainer.ch)
                width: gridContainer.width
                height: 1
                color: ocean.currentPalette ? ocean.currentPalette.grid : "#294956"
                opacity: 0.35
            }
        }
    }
    // Cached caustic speck texture (repainted about once per second, then drifted)
    Caustics {
        id: caustics
        anchors.fill: parent
        frame: ocean.engine ? ocean.engine.frame : null
        frameSerial: ocean.frameSerial
        palette: ocean.currentPalette
        light: ocean.currentLight
        enabled: ocean.showWaves
        active: ocean.animating
        cellWidth: ocean.engine ? ocean.engine.cellWidth : 12
        cellHeight: ocean.engine ? ocean.engine.cellHeight : 18
    }

    // Native Atmosphere (Clouds, Swells/Waves, Wakes) - rendered in ocean water layer
    Atmosphere {
        id: atmosphere
        anchors.fill: parent
        frame: ocean.engine ? ocean.engine.frame : null
        frameSerial: ocean.frameSerial
        showClouds: ocean.showClouds
        showWaves: ocean.showWaves
        scenePalette: ocean.currentPalette
        light: ocean.currentLight
    }

    // Marine life (Creatures & Mythical beasts) swimming above water swells
    Repeater {
        id: animalsRepeater
        model: 4

        Animal {
            required property int index
            readonly property var slotAnimal: (ocean.animalSlots && ocean.animalSlots.length > index)
                                               ? ocean.animalSlots[index]
                                               : (ocean.engine && ocean.engine.frame && ocean.engine.frame.animals ? ocean.engine.frame.animals[index] : null)
            animal: slotAnimal
            epoch: ocean.frameSerial
            light: ocean.currentLight
        }
    }

    // Fish school (small fish darting across ocean)
    Repeater {
        id: fishRepeater
        objectName: "fishRepeater"
        readonly property int fishQuota: ocean.qualityLevel === 2 ? 80 : ocean.qualityLevel === 1 ? 120 : 160
        model: Math.min(fishQuota, ocean.fishCount)

        Text {
            required property int index
            readonly property var f: ocean.engine && ocean.engine.world && ocean.engine.world.fish ? ocean.engine.world.fish[index] : null

            visible: f ? f.alive : false
            x: { ocean.frameSerial; return f ? f.x : 0; }
            y: { ocean.frameSerial; return f ? f.y : 0; }
            rotation: { ocean.frameSerial; return f ? Math.atan2(f.vy, f.vx) * 180 / Math.PI : 0; }

            text: f ? (["-", "~", ">", "=", "*", "·"][f.species % 6]) : "-"
            color: {
                const sp = f ? f.species % 6 : 0;
                return ["#36cfc9", "#ffc53d", "#ff7a45", "#52c41a", "#b37feb", "#ff85c0"][sp];
            }
            opacity: f ? Math.max(0.4, Math.min(1.0, (0.55 + 0.45 * (f.depth - 0.55) / 0.45 + 0.3 * Math.max(Math.abs(f.turn) / 3.5, f.alarm)) * ocean.currentLight)) : 0.6
            font.family: "monospace"
            font.pixelSize: 13
            font.bold: true
        }
    }

    // Surface Snow layer (snowflakes falling through air, landing, drifting, and melting on water)
    Item {
        anchors.fill: parent
        visible: ocean.showRain && ocean.currentSnowIntensity > 0

        Repeater {
            model: ocean.snowFlakeCount

            Item {
                required property int index
                readonly property var s: ocean.engine && ocean.engine.frame && ocean.engine.frame.snowFlakes ? ocean.engine.frame.snowFlakes[index] : null
                visible: s && s.y >= -16 && s.y <= ocean.height + 16 && s.x >= -20 && s.x <= ocean.width + 20 && s.alpha > 0.02
                x: { ocean.frameSerial; return s ? s.x : 0; }
                y: { ocean.frameSerial; return s ? s.y : 0; }
                opacity: s ? Math.min(1.0, s.alpha * (0.65 + 0.35 * ocean.currentSnowIntensity)) : 0

                // Cold water slush halo while floating on water (state 1)
                Rectangle {
                    visible: s && s.state === 1
                    x: -width * 0.5
                    y: -height * 0.5
                    width: s ? s.size * 1.6 : 18
                    height: s ? s.size * 0.9 : 10
                    radius: width * 0.5
                    color: "transparent"
                    border.color: "#d0f4ff"
                    border.width: 1
                    opacity: s ? s.alpha * 0.4 : 0
                }

                // Snowflake character (drifts in air, then floats on water)
                Text {
                    x: -width * 0.5
                    y: -height * 0.5
                    text: s ? s.glyph : "*"
                    color: "#ffffff"
                    font.family: "monospace"
                    font.pixelSize: s ? s.size : 14
                    font.bold: true
                }
            }
        }
    }

    // Surface Rain layer (falling rain streaks hitting water surface & blooming into ripples)
    Item {
        anchors.fill: parent
        visible: ocean.showRain && ocean.currentRainIntensity > 0

        Repeater {
            model: ocean.rainDropCount
            Item {
                required property int index
                readonly property var d: ocean.engine && ocean.engine.frame && ocean.engine.frame.rainDrops ? ocean.engine.frame.rainDrops[index] : null
                visible: d && d.y >= -20 && d.y <= ocean.height + 20 && d.x >= -20 && d.x <= ocean.width + 20 && d.alpha > 0.02
                x: { ocean.frameSerial; return d ? d.x : 0; }
                y: { ocean.frameSerial; return d ? d.y : 0; }
                opacity: d ? Math.min(1.0, d.alpha * (0.7 + 0.3 * ocean.currentRainIntensity)) : 0

                // State 0: Slanted streak falling in air
                Rectangle {
                    visible: d && d.state === 0
                    x: -2
                    y: - (d ? d.streakLength : 18)
                    width: 1.8
                    height: d ? d.streakLength : 18
                    color: "#c8f0ff"
                    rotation: -14
                    transformOrigin: Item.BottomRight
                }

                Text {
                    visible: d && d.state === 0
                    x: -4
                    y: -4
                    text: "'"
                    color: "#ffffff"
                    font.family: "monospace"
                    font.pixelSize: 12
                    font.bold: true
                }

                // State 1: Surface ripple on water
                Rectangle {
                    visible: d && d.state === 1
                    x: -width * 0.5
                    y: -height * 0.5
                    width: { ocean.frameSerial; return d ? Math.max(6, d.radius * 2 * 1.8) : 6; }
                    height: { ocean.frameSerial; return d ? Math.max(3, d.radius * 2 * 0.75) : 3; }
                    radius: width * 0.5
                    color: "transparent"
                    border.color: (d && d.radius / d.maxRadius < 0.35) ? "#ffffff" : "#a6f0ff"
                    border.width: (d && d.radius / d.maxRadius < 0.25) ? 1.8 : 1.2
                }

                Text {
                    visible: d && d.state === 1
                    x: -width * 0.5
                    y: -height * 0.5
                    text: (d && d.radius / d.maxRadius < 0.22) ? (d ? d.glyph : "*") : ((d && d.radius / d.maxRadius < 0.52) ? "o" : "( )")
                    color: (d && d.radius / d.maxRadius < 0.22) ? "#ffffff" : "#b0f0ff"
                    font.family: "monospace"
                    font.pixelSize: (d && d.radius / d.maxRadius < 0.22) ? 14 : 11
                    font.bold: true
                    opacity: d ? (1 - d.radius / d.maxRadius) * 0.95 : 0
                }
            }
        }
    }
    // Passive pointer handlers
    HoverHandler {
        enabled: ocean.mouseInteraction && ocean.animating
        onPointChanged: if (ocean.engine) ocean.engine.onPointerMove(point.position.x, point.position.y)
        onHoveredChanged: if (!hovered && ocean.engine) ocean.engine.onPointerLeave()
    }

    TapHandler {
        enabled: ocean.mouseInteraction && ocean.animating
        acceptedButtons: Qt.LeftButton
        gesturePolicy: TapHandler.DragThreshold
        onTapped: function(eventPoint, button) {
            if (ocean.engine) ocean.engine.onPointerDown(eventPoint.position.x, eventPoint.position.y);
        }
    }

    // Main frame loop via FrameAnimation
    property double lastFrameTime: 0
    property double frameAccumulator: 0

    function advanceFrame(dt) {
        if (!engine || width <= 0 || height <= 0) return;
        const start = Date.now();

        const overrides = {};
        if (previewPhase !== "auto") overrides.phase = previewPhase;
        if (previewWeather !== "auto") overrides.weather = previewWeather;

        const snap = engine.advance(dt, overrides);

        const env = snap.environment;
        if (env) {
            environmentState = env;
            currentPalette = env.palette;
            currentLight = env.palette ? env.palette.light : 1.0;
            currentRainIntensity = snap.rainIntensity !== undefined ? snap.rainIntensity : (env.rainIntensity || 0);
            currentSnowIntensity = snap.snowIntensity !== undefined ? snap.snowIntensity : (env.snowIntensity || 0);
        }
        rainDropCount = (showRain && currentRainIntensity > 0 && snap.rainDrops) ? snap.rainDrops.length : 0;
        rippleCount = (showRain && currentRainIntensity > 0 && snap.ripples) ? snap.ripples.length : 0;
        snowFlakeCount = (showRain && currentSnowIntensity > 0 && snap.snowFlakes) ? snap.snowFlakes.length : 0;
        animalSlots = snap.animals || [];

        const cost = Date.now() - start;
        lastUpdateMs = cost;
        frameSerial++;
        // Dynamic quality evaluation
        updateCosts.push(cost);
        if (updateCosts.length > 150) updateCosts.shift();

        if (start - lastQualityCheckMs >= 5000) {
            lastQualityCheckMs = start;
            if (updateCosts.length >= 30) {
                const sorted = updateCosts.slice().sort((a, b) => a - b);
                const p95 = sorted[Math.floor(sorted.length * 0.95)];
                if (p95 > 8) {
                    if (qualityLevel < 2) qualityLevel++;
                    lowCostDuration = 0;
                } else if (p95 < 4) {
                    lowCostDuration += 5;
                    if (lowCostDuration >= 20 && qualityLevel > 0) {
                        qualityLevel--;
                        lowCostDuration = 0;
                    }
                } else {
                    lowCostDuration = 0;
                }
            }
        }
    }

    FrameAnimation {
        id: frameAnim
        running: ocean.animating
        onTriggered: {
            const now = Date.now();
            if (ocean.lastFrameTime === 0) {
                ocean.lastFrameTime = now;
                return;
            }

            const elapsedSec = (now - ocean.lastFrameTime) / 1000;
            ocean.lastFrameTime = now;

            // Cap elapsed to avoid catch-up avalanche
            const clampedElapsed = Math.min(0.1, Math.max(0, elapsedSec));
            ocean.frameAccumulator += clampedElapsed;

            const targetInterval = 1 / ocean.targetFps;
            if (ocean.frameAccumulator >= targetInterval) {
                const dt = ocean.frameAccumulator * Math.max(0, ocean.speed);
                ocean.frameAccumulator = Math.max(0, ocean.frameAccumulator - targetInterval);
                ocean.advanceFrame(dt);
            }
        }
    }
}
