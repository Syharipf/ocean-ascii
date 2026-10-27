import QtQuick
import QtQuick.Window
import "../package/contents/ui" as UI

Window {
    id: bench
    width: 1920
    height: 1200
    visible: true
    flags: Qt.Window | Qt.FramelessWindowHint
    title: "Laut ASCII — native benchmark"

    property var updateCosts: []
    property int sceneUpdates: 0
    property int presentedFrames: 0
    property double started: 0

    onFrameSwapped: if (bench.started > 0) bench.presentedFrames++

    Item {
        id: sceneContainer
        width: 1920
        height: 1200
        clip: true

        UI.Ocean {
            id: ocean
            anchors.fill: parent
            pauseOnAppOpen: false
            mouseInteraction: false
            previewWeather: "rain"
            onFrameSerialChanged: {
                if (bench.started > 0) {
                    bench.sceneUpdates++;
                    bench.updateCosts.push(ocean.lastUpdateMs);
                }
            }
        }
    }

    // Warmup 2s
    Timer {
        interval: 2000
        running: true
        onTriggered: {
            bench.started = Date.now();
            bench.presentedFrames = 0;
            bench.sceneUpdates = 0;
            bench.updateCosts = [];
            finish.start();
        }
    }

    // Sample 15s
    Timer {
        id: finish
        interval: 15000
        onTriggered: {
            const seconds = (Date.now() - bench.started) / 1000;
            const sorted = bench.updateCosts.slice().sort((a, b) => a - b);
            const total = sorted.reduce((a, b) => a + b, 0);
            const median = sorted.length ? sorted[Math.floor(sorted.length * 0.5)] : 0;
            const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
            const maxCost = sorted.length ? sorted[sorted.length - 1] : 0;

            console.log(JSON.stringify({
                viewport: [bench.width, bench.height],
                sceneResolution: [sceneContainer.width, sceneContainer.height],
                targetFps: ocean.fps,
                qualityLevel: ocean.qualityLevel,
                seconds: seconds,
                sceneUpdates: bench.sceneUpdates,
                presentedFrames: bench.presentedFrames,
                sceneUpdatesPerSecond: bench.sceneUpdates / seconds,
                presentedFramesPerSecond: bench.presentedFrames / seconds,
                medianUpdateMs: median,
                meanUpdateMs: sorted.length ? total / sorted.length : 0,
                p95UpdateMs: p95,
                maxUpdateMs: maxCost
            }));
            Qt.quit();
        }
    }
}
