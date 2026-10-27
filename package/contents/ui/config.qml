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
        Kirigami.FormData.label: "Hewan Laut:"
        textRole: "text"
        valueRole: "value"
        model: [
            { text: "Bergantian Otomatis (Hewan & Makhluk Mistis)", value: "all" },
            { text: "Megalodon (Hiu Purba Raksasa)", value: "megalodon" },
            { text: "Leviathan (Naga Laut Purba)", value: "leviathan" },
            { text: "Kraken (Monster Gurita Abisal)", value: "kraken" },
            { text: "Pari Manta (Manta Ray)", value: "manta" },
            { text: "Penyu Laut (Sea Turtle)", value: "turtle" },
            { text: "Paus / Orca (Whale)", value: "whale" },
            { text: "Ikan Todak / Marlin (Swordfish)", value: "swordfish" },
            { text: "Cumi-Cumi Raksasa (Giant Squid)", value: "squid" },
            { text: "Ubur-Ubur (Jellyfish)", value: "jellyfish" },
            { text: "Hammerhead (Hiu Martil)", value: "hammerhead" },
            { text: "Tiger Shark (Hiu Harimau)", value: "tiger" },
            { text: "Shortfin Mako (Hiu Mako)", value: "mako" },
            { text: "Thresher Shark (Hiu Tikus)", value: "thresher" },
            { text: "Zebra Shark (Hiu Zebra)", value: "zebra" }
        ]
        currentIndex: Math.max(0, indexOfValue(root.cfg_sharkKind))
        onActivated: root.cfg_sharkKind = currentValue
    }

    Controls.CheckBox {
        id: cloudCheck
        Kirigami.FormData.label: "Siluet Awan Tipis:"
        text: "Tampilkan siluet awan tipis transparan di langit laut"
    }

    Controls.CheckBox {
        id: rainCheck
        Kirigami.FormData.label: "Hujan acak:"
        text: "Izinkan hujan datang dan reda otomatis"
    }

    Controls.CheckBox {
        id: waveCheck
        Kirigami.FormData.label: "Gelombang Laut:"
        text: "Tampilkan ombak dan alunan gelombang air laut"
    }
    Controls.CheckBox {
        id: mouseCheck
        Kirigami.FormData.label: "Interaksi Mouse:"
        text: "Ikan menghindar kursor dan riak air saat klik"
    }

    Controls.CheckBox {
        id: pauseCheck
        Kirigami.FormData.label: "Hemat Baterai & Auto-Freeze:"
        text: "Bekukan animasi saat ada jendela aplikasi terlihat di desktop saat ini"
    }

    Controls.ComboBox {
        id: fpsCombo
        implicitWidth: 260
        Kirigami.FormData.label: "Target FPS (Performa):"
        textRole: "text"
        valueRole: "value"
        model: [
            { text: "30 FPS (beban lebih rendah)", value: 30 },
            { text: "40 FPS", value: 40 },
            { text: "60 FPS (beban lebih tinggi)", value: 60 }
        ]
        currentIndex: Math.max(0, indexOfValue(root.cfg_fps))
        onActivated: root.cfg_fps = currentValue
    }
}
