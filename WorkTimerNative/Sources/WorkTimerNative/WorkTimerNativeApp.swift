import AppKit
import SwiftUI

@main
struct WorkTimerNativeApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        MenuBarExtra("Work Timer", systemImage: "clock") {
            MenuBarContentView(
                store: appDelegate.store,
                openWidget: { appDelegate.showPanel(with: appDelegate.store) },
                toggleWidget: { appDelegate.togglePanel(with: appDelegate.store) },
                resetPosition: { appDelegate.resetPanelOrigin() }
            )
            .frame(width: 320)
        }
        .menuBarExtraStyle(.window)

        Settings {
            SettingsView(store: appDelegate.store)
                .frame(width: 320, height: 190)
        }
        .defaultSize(width: 320, height: 190)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }
    }
}
