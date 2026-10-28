import QtQuick
import QtQuick.Window
import "../package/contents/ui" as UI

Window {
    id: phaseCheck
    width: 960
    height: 600
    visible: true
    flags: Qt.Window | Qt.FramelessWindowHint

    property var phases: ["morning", "day", "evening", "night"]
    property int stage: 0

    UI.Ocean {
        id: ocean
        anchors.fill: parent
        pauseOnAppOpen: false
        previewWeather: "clear"
    }

    Timer {
        id: applyTimer
        interval: 900
        repeat: false
        running: true
        onTriggered: {
            if (phaseCheck.stage >= phaseCheck.phases.length) {
                console.log("PHASES_CAPTURED: " + phaseCheck.stage);
                Qt.quit();
                return;
            }
            ocean.previewPhase = phaseCheck.phases[phaseCheck.stage];
            captureTimer.restart();
        }
    }

    Timer {
        id: captureTimer
        interval: 900
        repeat: false
        onTriggered: {
            const name = phaseCheck.phases[phaseCheck.stage];
            ocean.grabToImage(function(result) {
                result.saveToFile("/tmp/laut-phase-" + name + ".png");
                console.log("SAVED: " + name);
                phaseCheck.stage++;
                applyTimer.restart();
            });
        }
    }
}
