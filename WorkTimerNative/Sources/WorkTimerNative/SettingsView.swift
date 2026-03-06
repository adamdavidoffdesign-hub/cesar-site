import SwiftUI

struct SettingsView: View {
    @ObservedObject var store: WorkTimerStore

    var body: some View {
        Form {
            Section("Цель") {
                Stepper(value: $store.targetHours, in: 1 ... 24, step: 0.5) {
                    Text("\(store.targetHours.formatted(.number.precision(.fractionLength(0 ... 1)))) часов")
                }
            }

            Section("Статус") {
                LabeledContent("Сегодня") {
                    Text(store.activeLabel)
                }
                LabeledContent("Сон исключён") {
                    Text(store.sleepLabel)
                }
                LabeledContent("Старт") {
                    Text(store.startLabel)
                }
            }
        }
        .formStyle(.grouped)
        .padding()
    }
}
