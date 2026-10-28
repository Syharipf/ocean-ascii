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

    // 1. Swells & Surface Capillary Ripples
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
            readonly property real swellSpeed: sw ? sw.speed : 36
            readonly property real swellPos: ((index * (loopDist / 7) + time * swellSpeed * 0.75) % loopDist) - 200
            readonly property real swellStrength: sw ? (0.5 + 0.5 * Math.sin(time * 0.75 + sw.phase + index * 0.85)) : 0.6
            readonly property real baseAlpha: Math.min(0.38, 0.12 + 0.26 * swellStrength) * atmosRoot.light

            visible: atmosRoot.width > 0

            // Deep swell crest
            Text {
                readonly property real disp: bandItem.sw ? (
                    bandItem.sw.amplitude * Math.sin(bandItem.time * 0.85 + bandItem.sw.phase)
                ) : 0
                x: -60 - ((bandItem.time * 18 + bandItem.index * 40) % 180)
                y: bandItem.swellPos + disp
                width: atmosRoot.width + 240
                height: 22
                rotation: -3.0

                text: bandItem.swellStrength > 0.65
                      ? "   ~   ·   ~      ^   ~      *   ~   ~      ^   ~      ·   ~   ^      ~   *      ~   ~   ^   "
                      : "         ~              ~              ·              ~              ~              ·   "
                color: atmosRoot.foamColor
                opacity: bandItem.baseAlpha
                font.family: "monospace"
                font.pixelSize: 13
                font.kerning: false
                textFormat: Text.PlainText
                wrapMode: Text.WrapAnywhere
            }

            // Secondary capillary ripple
            Text {
                readonly property real ripDisp: bandItem.sw ? (
                    (bandItem.sw.amplitude * 0.45) * Math.sin(bandItem.time * 1.4 + bandItem.sw.phase * 1.5)
                ) : 0
                x: -40 + ((bandItem.time * 24 + bandItem.index * 60) % 160)
                y: bandItem.swellPos + ripDisp + 38
                width: atmosRoot.width + 200
                height: 18
                rotation: -1.5

                text: "      .    ~    .         ·    ~         .    ~    .         ~    ·         .    ~         "
                color: atmosRoot.foamColor
                opacity: bandItem.baseAlpha * 0.55
                font.family: "monospace"
                font.pixelSize: 11
                font.kerning: false
                textFormat: Text.PlainText
                wrapMode: Text.WrapAnywhere
            }
        }
    }
    // 1b. Phase light shaft (sun / moon path)
    Rectangle {
        id: glowBand
        readonly property var band: atmosRoot.frame && atmosRoot.frame.ambience ? atmosRoot.frame.ambience.band : null
        visible: !!band && atmosRoot.width > 0
        width: atmosRoot.width * (band ? band.width : 0.3)
        height: atmosRoot.height
        x: atmosRoot.width * (band ? band.x : 0.5) - width * 0.5
        y: 0
        opacity: band ? band.alpha * atmosRoot.light : 0
        gradient: Gradient {
            GradientStop { position: 0.0; color: "transparent" }
            GradientStop { position: 0.5; color: atmosRoot.scenePalette && atmosRoot.scenePalette.glow ? atmosRoot.scenePalette.glow : "#a0eaff" }
            GradientStop { position: 1.0; color: "transparent" }
        }
    }

    // 1c. Phase glints (sparkles on the surface)
    Repeater {
        model: { atmosRoot.frameSerial; return atmosRoot.frame && atmosRoot.frame.ambience ? atmosRoot.frame.ambience.glints.length : 0 }

        Text {
            required property int index
            readonly property var g: atmosRoot.frame && atmosRoot.frame.ambience ? atmosRoot.frame.ambience.glints[index] : null
            readonly property real t: { atmosRoot.frameSerial; return atmosRoot.frame ? atmosRoot.frame.time : 0 }

            visible: !!g && atmosRoot.width > 0
            x: g ? g.x : 0
            y: g ? g.y : 0
            text: g ? g.glyph : "·"
            font.family: "monospace"
            font.pixelSize: g ? g.size : 9
            color: atmosRoot.scenePalette && atmosRoot.scenePalette.caustics ? atmosRoot.scenePalette.caustics : "#7ee8fa"
            opacity: g ? (0.25 + 0.75 * Math.max(0, Math.sin(t * g.freq + g.phase))) * atmosRoot.light : 0
        }
    }

    // 1d. Phase motes (mist, plankton)
    Repeater {
        model: { atmosRoot.frameSerial; return atmosRoot.frame && atmosRoot.frame.ambience ? atmosRoot.frame.ambience.motes.length : 0 }

        Text {
            required property int index
            readonly property var m: atmosRoot.frame && atmosRoot.frame.ambience ? atmosRoot.frame.ambience.motes[index] : null

            visible: !!m && atmosRoot.width > 0
            x: m ? m.x : 0
            y: m ? m.y : 0
            text: m ? m.glyph : "·"
            font.family: "monospace"
            font.pixelSize: 11
            color: atmosRoot.scenePalette && atmosRoot.scenePalette.foam ? atmosRoot.scenePalette.foam : "#b2dde0"
            opacity: m ? m.alpha * atmosRoot.light : 0
        }
    }

    // 1e. Phase birds (morning / evening flocks)
    Repeater {
        model: { atmosRoot.frameSerial; return atmosRoot.frame && atmosRoot.frame.ambience ? atmosRoot.frame.ambience.birds.length : 0 }

        Text {
            required property int index
            readonly property var b: atmosRoot.frame && atmosRoot.frame.ambience ? atmosRoot.frame.ambience.birds[index] : null

            visible: !!b && atmosRoot.width > 0
            x: b ? b.x : 0
            y: b ? b.y : 0
            text: b ? b.text : ""
            font.family: "monospace"
            font.pixelSize: 13
            color: atmosRoot.scenePalette && atmosRoot.scenePalette.cloud ? atmosRoot.scenePalette.cloud : "#d2dfe0"
            opacity: b ? b.alpha * atmosRoot.light : 0
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
