import QtQuick
import QtQuick.Window
import "../package/contents/ui" as UI

Window {
    id: bench
    width: 1920
    height: 1200
    visible: true
    flags: Qt.Window | Qt.FramelessWindowHint
    title: "Laut ASCII — benchmark Qt (8 detik)"
    property var costs: []
    property double started: 0
    property int completedPaints: 0

    UI.Ocean {
        id: ocean
        anchors.fill: parent
        pauseOnAppOpen: false
        mouseInteraction: false
    }

    Timer {
        interval: 1500
        running: true
        onTriggered: {
            const original = ocean.engine.render.bind(ocean.engine);
            ocean.engine.render = function(ctx, dt) {
                const before = Date.now();
                original(ctx, dt);
                bench.costs.push(Date.now() - before);
            };
            for (const child of ocean.children) {
                if (child instanceof Canvas) {
                    child.painted.connect(function() { bench.completedPaints++; });
                }
            }
            bench.started = Date.now();
            finish.start();
        }
    }

    Timer {
        id: finish
        interval: 6000
        onTriggered: {
            const seconds = (Date.now() - bench.started) / 1000;
            const sorted = bench.costs.slice().sort(function(a, b) { return a - b; });
            const total = sorted.reduce(function(a, b) { return a + b; }, 0);
            console.log(JSON.stringify({
                viewport: [ocean.width, ocean.height], targetFps: ocean.fps,
                seconds: seconds, renders: sorted.length, completedPaints: bench.completedPaints,
                rendersPerSecond: sorted.length / seconds,
                completedPaintsPerSecond: bench.completedPaints / seconds,
                meanRenderMs: total / Math.max(1, sorted.length),
                p95RenderMs: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
                maxRenderMs: sorted[sorted.length - 1]
            }));
            Qt.quit();
        }
    }
}
