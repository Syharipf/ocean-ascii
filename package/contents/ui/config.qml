import QtQuick
import QtQuick.Controls as Controls
import QtQuick.Layouts
import org.kde.kirigami as Kirigami

Kirigami.FormLayout {
    id: root

    property string cfg_sharkKind: "all"
    property alias cfg_showClouds: cloudCheck.checked
    property alias cfg_showRain: rainCheck.checked
    property alias cfg_showWaves: waveCheck.checked
    property alias cfg_mouseInteraction: mouseCheck.checked
    property alias cfg_pauseOnAppOpen: pauseCheck.checked
    property int cfg_fps: 30

    Controls.ComboBox {
        id: sharkCombo
        implicitWidth: 380
        Kirigami.FormData.label: "Marine Life:"
        textRole: "text"
        valueRole: "value"
        model: [
            { text: "Rotating Species (Real & Mythic Creatures)", value: "all" },
            { text: "Megalodon (Ancient Apex Shark)", value: "megalodon" },
            { text: "Leviathan (Abyssal Sea Serpent)", value: "leviathan" },
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
        currentIndex: Math.max(0, indexOfValue(root.cfg_sharkKind))
        onActivated: root.cfg_sharkKind = currentValue
    }

    Controls.CheckBox {
        id: cloudCheck
        Kirigami.FormData.label: "Translucent Clouds:"
        text: "Display soft translucent ASCII cloud mist across the surface"
    }

    Controls.CheckBox {
        id: rainCheck
        Kirigami.FormData.label: "Dynamic Weather:"
        text: "Allow stochastic rain showers and gentle snowfall with water impacts"
    }

    Controls.CheckBox {
        id: waveCheck
        Kirigami.FormData.label: "Ocean Swells:"
        text: "Display undulating surface swells and foam wave crests"
    }
    Controls.CheckBox {
        id: mouseCheck
        Kirigami.FormData.label: "Mouse Interaction:"
        text: "Fish scatter from cursor and clicks trigger water ripples"
    }

    Controls.CheckBox {
        id: pauseCheck
        Kirigami.FormData.label: "Battery Saver & Auto-Pause:"
        text: "Freeze wallpaper animation when application windows are visible on desktop"
    }

    Controls.ComboBox {
        id: fpsCombo
        implicitWidth: 260
        Kirigami.FormData.label: "Target Frame Rate:"
        textRole: "text"
        valueRole: "value"
        model: [
            { text: "30 FPS (lower CPU load)", value: 30 },
            { text: "40 FPS", value: 40 },
            { text: "60 FPS (higher smoothness)", value: 60 }
        ]
        currentIndex: Math.max(0, indexOfValue(root.cfg_fps))
        onActivated: root.cfg_fps = currentValue
    }
}
