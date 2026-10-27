import QtQuick
import QtQuick.Window
import "../package/contents/ui" as UI

Window {
    id: win
    width: 960
    height: 600
    visible: true
    flags: Qt.Window | Qt.FramelessWindowHint

    property string outDir: "/tmp/laut-gif-frames"
    property int frameCount: 0
    property int maxFrames: 120 // 12s at 10fps
    property int currentSegment: 0

    // 4 segments (3s each, 30 frames each):
    // 0: morning-clear (manta, turtle, whale, jellyfish)
    // 1: day-rain (hammerhead, tiger, mako, thresher)
    // 2: evening-clear (squid, swordfish, zebra, manta)
    // 3: night-rain (whale, jellyfish, turtle, hammerhead)
    readonly property var segments: [
        {
            phase: "morning", weather: "clear",
            kinds: [{ kind: "manta", size: 1.0 }, { kind: "turtle", size: 0.88 }, { kind: "whale", size: 0.78 }, { kind: "jellyfish", size: 0.68 }]
        },
        {
            phase: "day", weather: "rain",
            kinds: [{ kind: "megalodon", size: 1.15 }, { kind: "hammerhead", size: 0.88 }, { kind: "tiger", size: 0.78 }, { kind: "mako", size: 0.68 }]
        },
        {
            phase: "evening", weather: "clear",
            kinds: [{ kind: "kraken", size: 1.2 }, { kind: "squid", size: 0.88 }, { kind: "swordfish", size: 0.78 }, { kind: "zebra", size: 0.68 }]
        },
        {
            phase: "night", weather: "rain",
            kinds: [{ kind: "leviathan", size: 1.25 }, { kind: "whale", size: 0.95 }, { kind: "jellyfish", size: 0.75 }, { kind: "thresher", size: 0.68 }]
        }
    ]

    UI.Ocean {
        id: ocean
        anchors.fill: parent
        pauseOnAppOpen: false
        previewPhase: win.segments[win.currentSegment].phase
        previewWeather: win.segments[win.currentSegment].weather
    }

    function applySegment(idx) {
        currentSegment = idx;
        const seg = segments[idx];
        ocean.previewPhase = seg.phase;
        ocean.previewWeather = seg.weather;
        if (ocean.engine) {
            ocean.engine.world.sharkSpecs = seg.kinds;
            ocean.engine.world.seed();
            ocean.engine.prevWorldSharks = [];
        }
    }

    function captureNext() {
        if (win.frameCount >= win.maxFrames) {
            console.log("CAPTURED_ALL_FRAMES: " + win.frameCount);
            Qt.quit();
            return;
        }

        const targetSegment = Math.floor(win.frameCount / 30);
        if (targetSegment !== win.currentSegment) {
            win.applySegment(targetSegment);
        }

        // Advance simulation by 0.1s per frame (10 FPS)
        ocean.advanceFrame(0.1);

        const frameNum = String(win.frameCount).padStart(4, "0");
        const filePath = win.outDir + "/frame_" + frameNum + ".png";

        ocean.grabToImage(function(result) {
            result.saveToFile(filePath);
            win.frameCount++;
            stepTimer.start();
        });
    }

    Timer {
        id: stepTimer
        interval: 15
        repeat: false
        onTriggered: win.captureNext()
    }

    Timer {
        interval: 1000
        running: true
        onTriggered: {
            ocean.running = false;
            win.applySegment(0);
            win.captureNext();
        }
    }
}
