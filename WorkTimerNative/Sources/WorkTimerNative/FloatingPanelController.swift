import AppKit
import SwiftUI

private final class WidgetPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

final class FloatingPanelController: NSWindowController, NSWindowDelegate {
    private static let frameOriginKey = "worktimer.native.panel.origin"

    private let store: WorkTimerStore

    init(store: WorkTimerStore) {
        self.store = store

        let startRect = NSRect(x: 0, y: 0, width: 500, height: 300)
        let panel = WidgetPanel(
            contentRect: startRect,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = true
        panel.titleVisibility = .hidden
        panel.titlebarAppearsTransparent = true
        panel.isMovableByWindowBackground = true
        panel.hidesOnDeactivate = false
        panel.contentView = NSHostingView(rootView: WidgetPanelView(store: store))

        super.init(window: panel)
        panel.delegate = self
        applySavedOrigin()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func show() {
        guard let window else { return }
        window.orderFrontRegardless()
        window.makeKey()
    }

    func hide() {
        window?.orderOut(nil)
    }

    func resetOrigin() {
        UserDefaults.standard.removeObject(forKey: Self.frameOriginKey)
        applySavedOrigin()
    }

    func windowDidMove(_ notification: Notification) {
        guard let origin = window?.frame.origin else { return }
        UserDefaults.standard.set(NSStringFromPoint(origin), forKey: Self.frameOriginKey)
    }

    private func applySavedOrigin() {
        guard let window else { return }

        if let rawOrigin = UserDefaults.standard.string(forKey: Self.frameOriginKey) {
            window.setFrameOrigin(NSPointFromString(rawOrigin))
            return
        }

        let visibleFrame = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let origin = NSPoint(
            x: max(visibleFrame.minX + 16, visibleFrame.maxX - window.frame.width - 24),
            y: max(visibleFrame.minY + 16, visibleFrame.maxY - window.frame.height - 40)
        )
        window.setFrameOrigin(origin)
    }
}
