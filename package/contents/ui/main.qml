import QtQuick
import org.kde.plasma.plasmoid

WallpaperItem {
    id: root

    DesktopVisibility { id: desktopVisibility }

    Ocean {
        anchors.fill: parent
        hasVisibleWindows: desktopVisibility.hasVisibleWindows
        sharkKind: (root.configuration && root.configuration.sharkKind) ? root.configuration.sharkKind : "all"
        showRain: (root.configuration && root.configuration.showRain !== undefined) ? root.configuration.showRain : true
        showWaves: (root.configuration && root.configuration.showWaves !== undefined) ? root.configuration.showWaves : true
        showClouds: (root.configuration && root.configuration.showClouds !== undefined) ? root.configuration.showClouds : true
        mouseInteraction: (root.configuration && root.configuration.mouseInteraction !== undefined) ? root.configuration.mouseInteraction : true
        fps: (root.configuration && root.configuration.fps) ? root.configuration.fps : 30
        pauseOnAppOpen: (root.configuration && root.configuration.pauseOnAppOpen !== undefined) ? root.configuration.pauseOnAppOpen : true
    }
}
