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
    property double frozenTime: 0
    property double resumeStart: 0
    property int renders: 0
    property int pausedRenders: 0

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
                check.verify(ocean.engine.world.time > 0, "scene advances on real Qt Canvas");
                const original = ocean.engine.render.bind(ocean.engine);
                ocean.engine.render = function(ctx, dt) { check.renders++; original(ctx, dt); };
                check.verify(ocean.grabToImage(function(result) {
                    check.verify(result.saveToFile("/tmp/laut-ascii-release-before.png"), "save before image");
                }), "request before image");
                ocean.running = false;
                check.frozenTime = ocean.engine.world.time;
                check.pausedRenders = check.renders;
            } else if (check.stage === 1) {
                check.verify(ocean.engine.world.time === check.frozenTime, "no simulation while paused");
                check.verify(check.renders === check.pausedRenders, "no background repaint while paused");
                ocean.running = true;
                check.resumeStart = Date.now();
            } else if (check.stage === 2) {
                const advanced = ocean.engine.world.time - check.frozenTime;
                check.verify(advanced > 0 && advanced <= (Date.now() - check.resumeStart) / 1000 + 0.04,
                             "resume advances without replaying pause time");
                check.width = 1366;
                check.height = 768;
            } else if (check.stage === 3) {
                check.verify(ocean.engine.world.width === 1366 && ocean.engine.world.height === 768, "resize propagates");
                for (const animal of ocean.engine.world.sharks) {
                    for (const value of animal.nodes) check.verify(Number.isFinite(value), "finite animal spine");
                }
                check.verify(ocean.grabToImage(function(result) {
                    check.verify(result.saveToFile("/tmp/laut-ascii-release-after.png"), "save resized image");
                }), "request resized image");
                ocean.pauseOnAppOpen = true;
            } else if (check.stage === 4) {
                check.verify(ocean.hasVisibleWindows && !ocean.animating, "app window automatically freezes wallpaper");
                check.frozenTime = ocean.engine.world.time;
                check.pausedRenders = check.renders;
            } else if (check.stage === 5) {
                check.verify(ocean.engine.world.time === check.frozenTime, "auto-freeze stops simulation");
                check.verify(check.renders === check.pausedRenders, "auto-freeze stops repaint");
                ocean.pauseOnAppOpen = false;
            } else if (check.stage === 6) {
                check.verify(ocean.animating && ocean.engine.world.time > check.frozenTime, "disabling auto-freeze resumes");
                console.log("PASS: Qt render, pause, no paused repaint, resume, resize, app auto-freeze, ASCII mist");
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
