import QtQuick

Item {
    id: causticRoot
    clip: true

    property var frame: null
    property int frameSerial: 0
    property var palette: null
    property real light: 1.0
    property bool enabled: true
    property bool active: true
    property int cellWidth: 12
    property int cellHeight: 18

    readonly property real time: { frameSerial; return frame ? frame.time : 0; }
    readonly property string causticColor: palette && palette.caustics ? palette.caustics : "#7ee8fa"

    function channelOf(hex, offset) {
        const h = (hex || "").replace("#", "");
        if (h.length !== 6) return 160;
        return parseInt(h.slice(offset, offset + 2), 16);
    }

    property int textureTick: 0

    Timer {
        interval: 2500
        repeat: true
        running: causticRoot.enabled && causticRoot.active && causticRoot.width > 0
        onTriggered: causticRoot.textureTick++
    }

    Canvas {
        id: field
        width: causticRoot.width + 96
        height: causticRoot.height + 96
        x: -48 + Math.sin(causticRoot.time * 0.11) * 26 + Math.sin(causticRoot.time * 0.037) * 14
        y: -48 + Math.cos(causticRoot.time * 0.083) * 22 + Math.sin(causticRoot.time * 0.051) * 12
        visible: causticRoot.enabled && causticRoot.width > 0 && causticRoot.height > 0
        opacity: visible ? Math.min(0.55, 0.26 + 0.2 * causticRoot.light) : 0
        renderTarget: Canvas.Image
        renderStrategy: Canvas.Immediate

        property int repaintToken: causticRoot.textureTick * 131 + causticRoot.cellWidth * 7 + causticRoot.cellHeight

        onRepaintTokenChanged: requestPaint()
        onWidthChanged: requestPaint()
        onHeightChanged: requestPaint()
        Component.onCompleted: requestPaint()

        onPaint: {
            const ctx = getContext("2d");
            const W = width;
            const H = height;
            ctx.clearRect(0, 0, W, H);
            if (!causticRoot.enabled || W <= 0 || H <= 0) return;

            const cw = Math.max(8, causticRoot.cellWidth);
            const ch = Math.max(10, causticRoot.cellHeight);
            const cols = Math.ceil(W / cw);
            const rows = Math.ceil(H / ch);
            const t = causticRoot.time;
            const r = causticRoot.channelOf(causticRoot.causticColor, 0);
            const g = causticRoot.channelOf(causticRoot.causticColor, 2);
            const b = causticRoot.channelOf(causticRoot.causticColor, 4);
            const LEVELS = 5;
            const styles = [];
            for (let l = 0; l < LEVELS; l++) {
                const a = (0.05 + 0.075 * l).toFixed(3);
                styles.push("rgba(" + r + "," + g + "," + b + "," + a + ")");
            }
            const small = Math.max(2, Math.round(cw * 0.19));
            for (let level = 0; level < LEVELS; level++) {
                ctx.fillStyle = styles[level];
                const size = level >= 3 ? small + 1 : small;
                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < cols; col++) {
                        const seed = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
                        const phase = (seed - Math.floor(seed)) * Math.PI * 2;
                        const freq = 0.3 + (seed - Math.floor(seed)) * 0.9;
                        const twinkle = 0.5 + 0.5 * Math.sin(t * freq + phase);
                        const caustic = 0.85 + 0.15 * Math.sin(col * 0.11 + t * 0.35) * Math.sin(row * 0.17 - t * 0.27);
                        const v = Math.min(1, Math.max(0, (0.55 + 0.45 * twinkle) * caustic));
                        if (v < 0.62) continue;
                        const lvl = Math.min(LEVELS - 1, Math.floor((v - 0.62) / 0.38 * LEVELS));
                        if (lvl !== level) continue;
                        ctx.fillRect(Math.round(col * cw + cw * 0.5 - size / 2), Math.round(row * ch + ch * 0.5 - size / 2), size, size);
                    }
                }
            }
        }
    }
}
