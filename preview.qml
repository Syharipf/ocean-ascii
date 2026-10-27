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
    title: "Laut ASCII — Pratinjau"

    UI.Ocean {
        id: ocean
        anchors.fill: parent
        sharkKind: kindSelector.currentValue
        pauseOnAppOpen: false
        showClouds: cloudCheck.checked
        showRain: rainCheck.checked
        mouseInteraction: mouseCheck.checked
    }

    // Floating minimal overlay controls for preview testing
    Rectangle {
        id: controlBar
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.margins: 16
        width: controlsRow.implicitWidth + 24
        height: controlsRow.implicitHeight + 16
        radius: 8
        color: Qt.rgba(0.01, 0.05, 0.09, 0.85)
        border.color: Qt.rgba(0.5, 0.83, 0.81, 0.3)
        border.width: 1

        Row {
            id: controlsRow
            anchors.centerIn: parent
            spacing: 12

            Controls.Label {
                anchors.verticalCenter: parent.verticalCenter
                text: "Hewan:"
                color: "#80d5d0"
                font.family: "monospace"
            }

            Controls.ComboBox {
                id: kindSelector
                anchors.verticalCenter: parent.verticalCenter
                textRole: "text"
                valueRole: "value"
                model: [
                    { text: "Bergantian Otomatis (Semua Hewan)", value: "all" },
                    { text: "Pari Manta", value: "manta" },
                    { text: "Penyu Laut", value: "turtle" },
                    { text: "Paus / Orca", value: "whale" },
                    { text: "Ikan Todak (Swordfish)", value: "swordfish" },
                    { text: "Cumi-Cumi (Giant Squid)", value: "squid" },
                    { text: "Ubur-Ubur", value: "jellyfish" },
                    { text: "Hammerhead", value: "hammerhead" },
                    { text: "Tiger Shark", value: "tiger" },
                    { text: "Shortfin Mako", value: "mako" },
                    { text: "Thresher", value: "thresher" }
                ]
            }

            Controls.CheckBox {
                id: cloudCheck
                anchors.verticalCenter: parent.verticalCenter
                text: "Kabut ASCII"
                checked: true
            }

            Controls.CheckBox {
                id: rainCheck
                anchors.verticalCenter: parent.verticalCenter
                text: "Hujan"
                checked: true
            }

            Controls.CheckBox {
                id: mouseCheck
                anchors.verticalCenter: parent.verticalCenter
                text: "Mouse"
                checked: true
            }
        }
    }
}
