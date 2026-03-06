import AppKit
import SwiftUI

struct MenuBarContentView: View {
    @ObservedObject var store: WorkTimerStore
    let openWidget: () -> Void
    let toggleWidget: () -> Void
    let resetPosition: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Экранное время")
                    .font(.system(size: 17, weight: .light))
                Text(store.activeLabel)
                    .font(.system(size: 34, weight: .ultraLight, design: .rounded))
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(store.progressText)
                    .font(.system(size: 13, weight: .light))
                ProgressView(value: store.progress)
                    .tint(.orange)
            }

            Stepper(value: $store.targetHours, in: 1 ... 24, step: 0.5) {
                Text("Цель: \(store.targetHours.formatted(.number.precision(.fractionLength(0 ... 1)))) ч")
                    .font(.system(size: 13, weight: .light))
            }

            Divider()

            Button("Показать виджет", action: openWidget)
            Button("Скрыть / показать", action: toggleWidget)
            Button("Сбросить позицию", action: resetPosition)
            Button("Обновить данные") { store.refreshSnapshot() }
            Text("Idle > 5 мин ставит учёт на паузу")
                .font(.system(size: 11, weight: .light))
                .foregroundStyle(.secondary)
            Divider()
            Button("Выход") { NSApp.terminate(nil) }
        }
        .padding(14)
    }
}
