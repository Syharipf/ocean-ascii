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
    readonly property int targetFps: Math.max(15, Math.min(60, fps))
    property bool hasVisibleWindows: false
    readonly property bool animating: running && visible && width > 0 && height > 0
                                      && (!pauseOnAppOpen || !hasVisibleWindows)
    property var engine: null
    property double lastTimestamp: 0
    property double renderDelta: 1 / targetFps
    property int cloudEpoch: 0
    property double paintCostMs: 0


    onSharkKindChanged: if (engine) { engine.setSharkKind(sharkKind); canvas.requestPaint(); }
    onShowCloudsChanged: if (engine) { engine.setShowClouds(showClouds); canvas.requestPaint(); }
    onShowRainChanged: if (engine) { engine.setShowRain(showRain); canvas.requestPaint(); }
    onShowWavesChanged: if (engine) { engine.setShowWaves(showWaves); canvas.requestPaint(); }
    onMouseInteractionChanged: if (engine) {
        engine.mouseInteraction = mouseInteraction;
        if (!mouseInteraction) engine.onPointerLeave();
    }
    onWidthChanged: resizeScene.restart()
    onHeightChanged: resizeScene.restart()
    onAnimatingChanged: {
        lastTimestamp = 0;
        if (engine) {
            engine.resetStep();
            engine.onPointerLeave();
        }
        if (animating && engine) nextFrame.restart();
        else nextFrame.stop();
    }

    Component.onCompleted: {
        engine = new Engine.OceanEngine({
            sharkKind: sharkKind, showRain: showRain, showWaves: showWaves,
            showClouds: showClouds, mouseInteraction: mouseInteraction, externalClouds: true
        });
        resizeScene.restart();
    }

    // Coalesce paired width/height changes; no reseeding on every resize signal.
    Timer {
        id: resizeScene
        interval: 0
        onTriggered: if (ocean.engine && ocean.width > 0 && ocean.height > 0) {
            ocean.engine.resize(ocean.width, ocean.height);
            ocean.lastTimestamp = 0;
            ocean.cloudEpoch++;
            canvas.requestPaint();
            if (ocean.animating) nextFrame.restart();
        }
    }

    Canvas {
        id: canvas
        anchors.fill: parent
        // Qt 6 supports Canvas.Image; FramebufferObject is ignored by Qt 6.
        renderTarget: Canvas.Image
        renderStrategy: Canvas.Immediate
        onPaint: {
            if (!ocean.engine || width <= 0 || height <= 0) return;
            const paintStarted = Date.now();
            const now = Date.now();
            if (ocean.animating) {
                // First resume frame stays still. Never replay time spent paused.
                ocean.renderDelta = ocean.lastTimestamp > 0
                        ? Math.min(0.05, Math.max(0, (now - ocean.lastTimestamp) / 1000)) : 0;
                ocean.lastTimestamp = now;
                if (ocean.renderDelta > 0) ocean.engine.step(ocean.renderDelta * Math.max(0, ocean.speed));
            }
            ocean.engine.render(getContext("2d"), ocean.renderDelta);
            ocean.cloudEpoch++;
            ocean.paintCostMs = Date.now() - paintStarted;
            if (ocean.animating) nextFrame.restart();
        }
    }

    Repeater {
        model: { ocean.cloudEpoch; return ocean.engine ? ocean.engine.clouds.clouds.length : 0; }
        Text {
            required property int index
            readonly property var cloud: {
                ocean.cloudEpoch;
                return ocean.engine.clouds.clouds[index];
            }
            x: { ocean.cloudEpoch; return cloud.x; }
            y: { ocean.cloudEpoch; return cloud.y; }
            opacity: cloud.alpha
            visible: ocean.showClouds
            text: cloud.text
            color: "#84a8bd"
            font.family: "monospace"
            font.pixelSize: 12
            font.kerning: false
            textFormat: Text.PlainText
            wrapMode: Text.NoWrap
        }
    }

    // Passive handlers preserve icon clicks, selection drags, and desktop menus.
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

    // Backpressure: allow at least one paint-duration idle between frames.
    // ponytail: Canvas remains CPU-rasterized; native scene graph is next step for high FPS.
    Timer {
        id: nextFrame
        interval: Math.max(Math.round(1000 / ocean.targetFps), Math.ceil(ocean.paintCostMs))
        onTriggered: if (ocean.animating) canvas.requestPaint()
    }
}
