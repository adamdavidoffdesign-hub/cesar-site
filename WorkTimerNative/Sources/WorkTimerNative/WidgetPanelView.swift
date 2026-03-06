import SwiftUI

struct WidgetPanelView: View {
    @ObservedObject var store: WorkTimerStore

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(store.dayLabel)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundStyle(.white.opacity(0.92))
                    Text("Экранное время")
                        .font(.system(size: 14, weight: .light))
                        .foregroundStyle(.white.opacity(0.82))
                }

                Spacer()

                HStack(spacing: 8) {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 10, height: 10)
                        .shadow(color: statusShadowColor, radius: 8)
                    Text(store.statusText)
                        .font(.system(size: 12, weight: .light))
                        .foregroundStyle(.white.opacity(0.76))
                }
            }

            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(store.activeLabel)
                    .font(.system(size: 72, weight: .ultraLight, design: .rounded))
                    .foregroundStyle(.white)
                    .tracking(-3)

                Spacer()

                Text(store.secondsLabel)
                    .font(.system(size: 26, weight: .ultraLight, design: .rounded))
                    .foregroundStyle(.white.opacity(0.92))
            }

            Text(store.progressText)
                .font(.system(size: 14, weight: .light))
                .foregroundStyle(.white.opacity(0.92))

            VStack(alignment: .leading, spacing: 9) {
                HStack {
                    Text("Ход дня")
                    Spacer()
                    Text("\(Int(store.progress * 100))%")
                }
                .font(.system(size: 11, weight: .regular))
                .textCase(.uppercase)
                .foregroundStyle(.black.opacity(0.8))

                ProgressView(value: store.progress)
                    .progressViewStyle(.linear)
                    .tint(.black)
                    .scaleEffect(x: 1, y: 1.6, anchor: .center)
            }
            .padding(14)
            .background(Color.orange)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            HStack(spacing: 8) {
                TargetCard(targetHours: $store.targetHours)

                StatCard(
                    title: "Сон и старт",
                    value: store.sleepLabel,
                    detail: "старт: \(store.startLabel) · idle > 5 мин"
                )
            }

            HStack {
                Text("Обновлено \(store.updatedLabel)")
                Spacer()
                Text("Sleep / Wake")
            }
            .font(.system(size: 11, weight: .light))
            .textCase(.uppercase)
            .foregroundStyle(.white.opacity(0.64))
        }
        .padding(14)
        .frame(width: 500)
        .background(Color.black.opacity(0.96))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.white.opacity(0.22), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.42), radius: 18, y: 10)
    }
}

private extension WidgetPanelView {
    var statusColor: Color {
        if !store.isAwakeNow {
            return .gray
        }
        if store.isIdleNow {
            return .orange
        }
        return .green
    }

    var statusShadowColor: Color {
        if !store.isAwakeNow {
            return .clear
        }
        if store.isIdleNow {
            return .orange.opacity(0.45)
        }
        return .green.opacity(0.45)
    }
}

private struct TargetCard: View {
    @Binding var targetHours: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Цель")
                .font(.system(size: 11, weight: .regular))
                .textCase(.uppercase)
                .foregroundStyle(.white.opacity(0.7))

            HStack(spacing: 6) {
                TextField(
                    "8",
                    value: $targetHours,
                    format: .number.precision(.fractionLength(0 ... 1))
                )
                .textFieldStyle(.plain)
                .font(.system(size: 24, weight: .light))
                .foregroundStyle(.white)

                Text("ч")
                    .font(.system(size: 16, weight: .light))
                    .foregroundStyle(.white.opacity(0.72))
            }

            Text("можно менять")
                .font(.system(size: 11, weight: .light))
                .foregroundStyle(.white.opacity(0.58))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color.white.opacity(0.18), lineWidth: 1)
        )
    }
}

private struct StatCard: View {
    let title: String
    let value: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 11, weight: .regular))
                .textCase(.uppercase)
                .foregroundStyle(.white.opacity(0.7))

            Text(value)
                .font(.system(size: 24, weight: .light))
                .foregroundStyle(.white)

            Text(detail)
                .font(.system(size: 11, weight: .light))
                .foregroundStyle(.white.opacity(0.58))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color.white.opacity(0.18), lineWidth: 1)
        )
    }
}
