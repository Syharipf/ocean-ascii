import QtQuick

Item {
    id: atmosRoot

    property var frame: null
    property int frameSerial: 0
    property bool showClouds: true
    property bool showWaves: true
    property var scenePalette: null
    property real light: 1.0

    readonly property string foamColor: scenePalette ? scenePalette.foam : "#b2dde0"
    readonly property string cloudColor: scenePalette ? scenePalette.cloud : "#d2dfe0"

    // 1. Swells (6 bands, 4 segments each)
    Repeater {
        id: swellBands
        model: atmosRoot.showWaves ? 7 : 0

        Item {
            id: bandItem
            required property int index
            readonly property var sw: atmosRoot.frame && atmosRoot.frame.swells ? atmosRoot.frame.swells[index % 6] : null
            readonly property real time: {
                atmosRoot.frameSerial;
                return atmosRoot.frame ? atmosRoot.frame.time : 0;
            }

            // Diagonal drift across ocean surface
            readonly property real loopDist: atmosRoot.height + 400
            readonly property real swellPos: ((index * (loopDist / 7) + time * (sw ? sw.speed * 0.7 : 24)) % loopDist) - 200
            readonly property real swellStrength: sw ? (0.5 + 0.5 * Math.sin(time * 0.6 + sw.phase + index * 0.8)) : 0.6
            readonly property real baseAlpha: Math.min(0.32, 0.12 + 0.2 * swellStrength) * atmosRoot.light

            visible: atmosRoot.width > 0
            // Organic undulating wave crest across the full width
            Text {
                readonly property real disp: bandItem.sw ? (
                    bandItem.sw.amplitude * Math.sin(bandItem.time * 0.8 + bandItem.sw.phase)
                ) : 0
                x: -60
                y: bandItem.swellPos + disp
                width: atmosRoot.width + 120
                height: 24
                rotation: -3.5
                clip: false

                text: bandItem.swellStrength > 0.6
                      ? "      ~  ·  ~      ^  ~      ·  ~  ~      ^  ~      ·  ~  ^      ~  ·      ~  ~  ^  "
                      : "          ~              ~              ~              ~              ~          "
                color: atmosRoot.foamColor
                opacity: bandItem.baseAlpha
                font.family: "monospace"
                font.pixelSize: 13
                font.kerning: false
                textFormat: Text.PlainText
                wrapMode: Text.WrapAnywhere
            }
        }
    }
    // 2. ASCII Clouds (5 blocks)
    Repeater {
        model: atmosRoot.showClouds && atmosRoot.frame && atmosRoot.frame.clouds ? atmosRoot.frame.clouds.length : 0

        Text {
            required property int index
            readonly property var c: atmosRoot.frame.clouds[index]
            readonly property real rainBoost: atmosRoot.frame && atmosRoot.frame.environment ? atmosRoot.frame.environment.rainIntensity * 0.08 : 0

            x: c ? c.x : 0
            y: c ? c.y : 0
            opacity: c ? Math.min(0.32, (c.alpha + rainBoost) * atmosRoot.light) : 0
            visible: atmosRoot.showClouds
            text: c ? c.text : ""
            color: atmosRoot.cloudColor
            font.family: "monospace"
            font.pixelSize: 12
            font.kerning: false
            textFormat: Text.PlainText
            wrapMode: Text.NoWrap
        }
    }

    // 5. Wake text particles (128 pool)
    Repeater {
        model: atmosRoot.frame && atmosRoot.frame.wakes ? atmosRoot.frame.wakes.length : 0

        Text {
            required property int index
            readonly property var w: atmosRoot.frame.wakes[index]
            visible: w && w.active && w.age < 1.5

            x: w ? w.x : 0
            y: w ? w.y : 0
            text: w ? w.glyph : "."
            color: "#6ee6ff"
            opacity: w ? Math.max(0, (1 - w.age / 1.5) * 0.65 * atmosRoot.light) : 0
            font.family: "monospace"
            font.pixelSize: 11
        }
    }
}
