import AppKit
import SwiftUI

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var panelController: FloatingPanelController?
    let store = WorkTimerStore()

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        showPanel(with: store)
        NSApp.activate(ignoringOtherApps: true)
    }

    func togglePanel(with store: WorkTimerStore) {
        if let panelController {
            if panelController.window?.isVisible == true {
                panelController.hide()
            } else {
                panelController.show()
            }
            return
        }

        showPanel(with: store)
    }

    func showPanel(with store: WorkTimerStore) {
        if panelController == nil {
            panelController = FloatingPanelController(store: store)
        }
        panelController?.show()
    }

    func resetPanelOrigin() {
        panelController?.resetOrigin()
    }
}
