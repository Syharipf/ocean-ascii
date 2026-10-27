import QtQuick

Item {
    id: animalRoot

    property var animal: null
    property int epoch: 0
    readonly property var appearance: { epoch; return animal ? animal.appearance : null; }
    property real light: 1.0

    visible: animal !== null
    opacity: animal ? Math.min(1.0, Math.max(0.1, animal.depth * light)) : 1.0

    readonly property real length: appearance ? appearance.length : 100
    readonly property real reach: appearance ? appearance.reach : 40
    readonly property real cellW: appearance ? appearance.cellWidth : 12
    readonly property real cellH: appearance ? appearance.cellHeight : 18
    readonly property string appearanceKey: appearance ? appearance.key : ""

    Repeater {
        id: stripsRepeater
        model: appearance ? appearance.strips.length : 0

        Item {
            id: stripItem
            required property int index

            readonly property var stripData: appearance.strips[index]
            readonly property real sStart: stripData.start
            readonly property real sEnd: stripData.end
            readonly property real sCenter: (sStart + sEnd) * 0.5

            // Position and rotation along the 20-node spine
            // 20 nodes -> index range 0..19
            readonly property real nodePos: (sCenter / (animalRoot.length || 1)) * 19
            readonly property int k: Math.min(18, Math.max(0, Math.floor(nodePos)))
            readonly property real f: nodePos - k
            readonly property real nodeX: {
                animalRoot.epoch;
                return animal && animal.nodes ? animal.nodes[k * 2] * (1 - f) + animal.nodes[(k + 1) * 2] * f : 0;
            }
            readonly property real nodeY: {
                animalRoot.epoch;
                return animal && animal.nodes ? animal.nodes[k * 2 + 1] * (1 - f) + animal.nodes[(k + 1) * 2 + 1] * f : 0;
            }

            readonly property real prevX: { animalRoot.epoch; return animal && animal.nodes ? animal.nodes[Math.max(0, k - 1) * 2] : 0; }
            readonly property real prevY: { animalRoot.epoch; return animal && animal.nodes ? animal.nodes[Math.max(0, k - 1) * 2 + 1] : 0; }
            readonly property real nextX: { animalRoot.epoch; return animal && animal.nodes ? animal.nodes[Math.min(19, k + 1) * 2] : 0; }
            readonly property real nextY: { animalRoot.epoch; return animal && animal.nodes ? animal.nodes[Math.min(19, k + 1) * 2 + 1] : 0; }

            // Orientation: longitudinal x points toward tail (positive node index)
            readonly property real angleRad: Math.atan2(nextY - prevY, nextX - prevX)

            x: nodeX
            y: nodeY
            rotation: angleRad * 180 / Math.PI

            // Static local cached Canvas for this strip
            Canvas {
                id: stripCanvas
                renderTarget: Canvas.Image
                renderStrategy: Canvas.Immediate

                // Strip dimensions: width is strip length + cellW padding, height is reach*2 + cellH padding
                readonly property real stripWidth: (sEnd - sStart) + animalRoot.cellW * 1.5
                readonly property real stripHeight: animalRoot.reach * 2 + animalRoot.cellH * 1.5

                width: Math.max(8, Math.ceil(stripWidth))
                height: Math.max(8, Math.ceil(stripHeight))

                // Center around the spine node
                x: -animalRoot.cellW * 0.75
                y: -stripHeight * 0.5

                property string stripKey: animalRoot.appearanceKey + ":" + index
                onStripKeyChanged: requestPaint()
                Component.onCompleted: requestPaint()

                onPaint: {
                    const ctx = getContext("2d");
                    ctx.clearRect(0, 0, width, height);

                    if (!stripData || !stripData.cells || stripData.cells.length === 0) return;

                    ctx.font = "600 " + Math.round(animalRoot.cellH * 0.74) + "px ui-monospace, Menlo, monospace";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";

                    const cw = animalRoot.cellW;
                    const ch = animalRoot.cellH;
                    const offsetY = height * 0.5;

                    for (let c = 0; c < stripData.cells.length; c++) {
                        const cell = stripData.cells[c];
                        const cx = cell.x + cw * 0.5;
                        const cy = cell.y + offsetY;

                        ctx.fillStyle = cell.background;
                        ctx.fillRect(Math.round(cx - cw * 0.5 + 1), Math.round(cy - ch * 0.5 + 1), cw - 1, ch - 1);

                        ctx.fillStyle = cell.foreground;
                        ctx.fillText(cell.glyph, Math.round(cx), Math.round(cy + 1));
                    }
                }
            }
        }
    }
}
