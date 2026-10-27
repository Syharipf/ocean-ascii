import QtQuick
import org.kde.kwindowsystem as WindowSystem
import org.kde.taskmanager as TaskManager

QtObject {
    readonly property bool hasVisibleWindows: tasks.count > 0 && !WindowSystem.KWindowSystem.showingDesktop
    property QtObject activityInfo: TaskManager.ActivityInfo { id: activities }
    property QtObject taskModel: TaskManager.TasksModel {
        id: tasks
        filterByCurrentVirtualDesktop: true
        filterByActivity: true
        activity: activities.currentActivity
        filterMinimized: true
        filterHidden: true
        groupMode: TaskManager.TasksModel.GroupDisabled
        launcherList: []
    }
}
