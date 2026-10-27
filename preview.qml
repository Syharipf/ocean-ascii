import QtQuick
import QtQuick.Window
import QtQuick.Controls as Controls
import "package/contents/ui" as UI

Window {
    id: previewWin
    width: 1200
    height: 750
    minimumWidth: 640
    minimumHeight: 480
    visible: true
    title: "Laut ASCII — Preview"

    UI.Ocean {
        id: ocean
        anchors.fill: parent
        sharkKind: kindSelector.currentValue
        previewPhase: phaseSelector.currentValue
        previewWeather: weatherSelector.currentValue
        pauseOnAppOpen: false
        showClouds: cloudCheck.checked
        showRain: rainCheck.checked
        mouseInteraction: mouseCheck.checked
    }

    // Top control overlay with 2 rows: animal/effects and phase/weather
    Rectangle {
        id: controlBar
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.margins: 16
        width: Math.min(previewWin.width - 32, controlCol.implicitWidth + 24)
        height: controlCol.implicitHeight + 20
        radius: 8
        color: Qt.rgba(0.01, 0.05, 0.09, 0.88)
        border.color: Qt.rgba(0.5, 0.83, 0.81, 0.35)
        border.width: 1

        Column {
            id: controlCol
            anchors.centerIn: parent
            spacing: 8
            padding: 4

            // Row 1: Animal selector and effects
            Row {
                spacing: 12

                Controls.Label {
                    anchors.verticalCenter: parent.verticalCenter
                    text: "Animal:"
                    color: "#80d5d0"
                    font.family: "monospace"
                    font.bold: true
                }

                Controls.ComboBox {
                    id: kindSelector
                    anchors.verticalCenter: parent.verticalCenter
                    implicitWidth: 260
                    textRole: "text"
                    valueRole: "value"
                    model: [
                        { text: "All Species + Mythic (Rotating)", value: "all" },
                        { text: "Megalodon (Ancient Predator)", value: "megalodon" },
                        { text: "Leviathan (Abyssal Serpent)", value: "leviathan" },
                        { text: "Kraken (Abyssal Terror)", value: "kraken" },
                        { text: "Manta Ray (manta)", value: "manta" },
                        { text: "Sea Turtle (turtle)", value: "turtle" },
                        { text: "Whale / Orca (whale)", value: "whale" },
                        { text: "Swordfish / Marlin (swordfish)", value: "swordfish" },
                        { text: "Giant Squid (squid)", value: "squid" },
                        { text: "Jellyfish (jellyfish)", value: "jellyfish" },
                        { text: "Hammerhead Shark (hammerhead)", value: "hammerhead" },
                        { text: "Tiger Shark (tiger)", value: "tiger" },
                        { text: "Shortfin Mako (mako)", value: "mako" },
                        { text: "Thresher Shark (thresher)", value: "thresher" },
                        { text: "Zebra Shark (zebra)", value: "zebra" }
                    ]
                }

                Controls.CheckBox {
                    id: cloudCheck
                    anchors.verticalCenter: parent.verticalCenter
                    text: "Clouds"
                    checked: true
                }

                Controls.CheckBox {
                    id: rainCheck
                    anchors.verticalCenter: parent.verticalCenter
                    text: "Rain"
                    checked: true
                }

                Controls.CheckBox {
                    id: mouseCheck
                    anchors.verticalCenter: parent.verticalCenter
                    text: "Mouse"
                    checked: true
                }
            }

            // Row 2: Phase and Weather overrides
            Row {
                spacing: 12

                Controls.Label {
                    anchors.verticalCenter: parent.verticalCenter
                    text: "Phase:"
                    color: "#80d5d0"
                    font.family: "monospace"
                    font.bold: true
                }

                Controls.ComboBox {
                    id: phaseSelector
                    anchors.verticalCenter: parent.verticalCenter
                    implicitWidth: 150
                    textRole: "text"
                    valueRole: "value"
                    model: [
                        { text: "Auto (20-min cycle)", value: "auto" },
                        { text: "Morning (0-5m)", value: "morning" },
                        { text: "Day (5-10m)", value: "day" },
                        { text: "Evening (10-15m)", value: "evening" },
                        { text: "Night (15-20m)", value: "night" }
                    ]
                }

                Controls.Label {
                    anchors.verticalCenter: parent.verticalCenter
                    text: "Weather:"
                    color: "#80d5d0"
                    font.family: "monospace"
                    font.bold: true
                }

                Controls.ComboBox {
                    id: weatherSelector
                    anchors.verticalCenter: parent.verticalCenter
                    implicitWidth: 140
                    textRole: "text"
                    valueRole: "value"
                    model: [
                        { text: "Auto (Random)", value: "auto" },
                        { text: "Clear (Cerius)", value: "clear" },
                        { text: "Rain (0.65)", value: "rain" }
                    ]
                }
            }
        }
    }
}
