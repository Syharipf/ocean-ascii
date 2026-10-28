import QtQuick
import QtQuick.Window
import "../package/contents/ui" as UI

Window {
    id: check
    width: 960
    height: 600
    flags: Qt.Window | Qt.FramelessWindowHint
    visible: true

    property int stage: 0
    property double frozenWorldTime: 0
    property double frozenEnvElapsed: 0
    property int frozenSerial: 0
    property double resumeStart: 0

    function verify(ok, message) {
        if (!ok) {
            console.error("FAIL: " + message);
            Qt.exit(1);
            throw new Error(message);
        }
    }

    UI.DesktopVisibility { id: desktopVisibility }
    UI.Ocean {
        id: ocean
        anchors.fill: parent
        pauseOnAppOpen: false
        hasVisibleWindows: desktopVisibility.hasVisibleWindows
    }

    Timer {
        interval: 500
        repeat: true
        running: true
        onTriggered: {
            if (check.stage === 0) {
                // Ensure scene is running and 4 slots initialized
                check.verify(ocean.engine !== null, "engine initialized");
                check.verify(ocean.frameSerial > 0, "frameSerial advances on native FrameAnimation");
                check.verify(ocean.engine.frame.animals.length === 4, "exact 4 animal slots invariant");
                check.verify(ocean.engine.world.time > 0, "simulation world time advances");
                const fishRepeaters = ocean.children.filter(c => c.objectName === "fishRepeater");
                check.verify(fishRepeaters.length === 1, "exactly one fishRepeater at root");
                const fr = fishRepeaters[0];
                const quota = ocean.qualityLevel === 2 ? 80 : ocean.qualityLevel === 1 ? 120 : 160;
                check.verify(fr.count === Math.min(quota, ocean.fishCount), "fishRepeater.count matches expected quota");
                check.verify(ocean.engine.ambience !== undefined, "ambience system attached");
                const amb = ocean.engine.frame.ambience;
                check.verify(!!amb && amb.glints.length > 0, "ambience glints populated for current phase");

                // Grab test image before pause
                check.verify(ocean.grabToImage(function(result) {
                    check.verify(result.saveToFile("/tmp/laut-ascii-release-before.png"), "save before image");
                }), "request before image");

                // Pause
                ocean.running = false;
                check.frozenWorldTime = ocean.engine.world.time;
                check.frozenEnvElapsed = ocean.engine.environment.elapsed;
                check.frozenSerial = ocean.frameSerial;
            } else if (check.stage === 1) {
                // Check frozen state after 500ms
                check.verify(ocean.engine.world.time === check.frozenWorldTime, "no simulation while paused");
                check.verify(ocean.engine.environment.elapsed === check.frozenEnvElapsed, "no environment time while paused");
                check.verify(ocean.frameSerial === check.frozenSerial, "no frame updates while paused");
            } else if (check.stage === 2) {
                // Check frozen state after 1000ms
                check.verify(ocean.engine.world.time === check.frozenWorldTime, "no simulation after 1000ms pause");
                check.verify(ocean.engine.environment.elapsed === check.frozenEnvElapsed, "no environment elapsed after 1000ms pause");
                check.verify(ocean.frameSerial === check.frozenSerial, "no frame updates after 1000ms pause");

                // Resume
                ocean.running = true;
                check.resumeStart = Date.now();
            } else if (check.stage === 3) {
                // Verify resume doesn't replay paused time
                const advanced = ocean.engine.world.time - check.frozenWorldTime;
                check.verify(advanced > 0, "resume advances");
                check.verify(advanced <= (Date.now() - check.resumeStart) / 1000 + 0.15,
                             "resume advances without replaying pause time");
                check.verify(ocean.frameSerial > check.frozenSerial, "frameSerial resumed");

                // Resize
                check.width = 1366;
                check.height = 768;
            } else if (check.stage === 4) {
                // Verify resize propagation
                check.verify(ocean.engine.width === 1366 && ocean.engine.height === 768, "resize propagates");
                check.verify(ocean.engine.frame.animals.length === 4, "exact 4 animal slots after resize");
                for (const animal of ocean.engine.frame.animals) {
                    for (const value of animal.nodes) check.verify(Number.isFinite(value), "finite animal spine");
                }

                // Grab resized image
                check.verify(ocean.grabToImage(function(result) {
                    check.verify(result.saveToFile("/tmp/laut-ascii-release-after.png"), "save resized image");
                }), "request resized image");

                // Test auto-freeze on visible windows
                ocean.pauseOnAppOpen = true;
            } else if (check.stage === 5) {
                check.verify(ocean.hasVisibleWindows && !ocean.animating, "app window automatically freezes wallpaper");
                check.frozenWorldTime = ocean.engine.world.time;
                check.frozenEnvElapsed = ocean.engine.environment.elapsed;
                check.frozenSerial = ocean.frameSerial;
            } else if (check.stage === 6) {
                check.verify(ocean.engine.world.time === check.frozenWorldTime, "auto-freeze stops simulation");
                check.verify(ocean.frameSerial === check.frozenSerial, "auto-freeze stops frame update");
                ocean.pauseOnAppOpen = false;
            } else if (check.stage === 7) {
                check.verify(ocean.animating && ocean.engine.world.time > check.frozenWorldTime, "disabling auto-freeze resumes");
                console.log("PASS: Native Qt scene, pause 1000ms, no drift, resume without catchup, resize, 4 slots, auto-freeze");
                Qt.quit();
            }
            check.stage++;
        }
    }

    Timer {
        interval: 20000
        running: true
        onTriggered: { console.error("FAIL: smoke deadline"); Qt.exit(1); }
    }
}
