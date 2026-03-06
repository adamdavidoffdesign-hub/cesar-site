import AppKit
import Combine
import CoreGraphics
import Foundation

@MainActor
final class WorkTimerStore: ObservableObject {
    private static let idleThresholdSeconds: TimeInterval = 300
    @Published private(set) var activeMs: Int = 0
    @Published private(set) var sleepMs: Int = 0
    @Published private(set) var isAwakeNow = true
    @Published private(set) var isIdleNow = false
    @Published private(set) var dayStart = Date()
    @Published private(set) var updatedAt = Date()
    @Published var targetHours: Double {
        didSet {
            let clamped = Self.clampTargetHours(targetHours)
            if clamped != targetHours {
                targetHours = clamped
                return
            }
            UserDefaults.standard.set(clamped, forKey: Self.targetHoursKey)
        }
    }

    private static let targetHoursKey = "worktimer.native.targetHours"

    private var lastTickAt = Date()
    private var timer: AnyCancellable?
    private var observers: [NSObjectProtocol] = []

    init() {
        let storedTarget = UserDefaults.standard.object(forKey: Self.targetHoursKey) as? Double ?? 8
        self.targetHours = Self.clampTargetHours(storedTarget)

        refreshSnapshot()
        startTimer()
        subscribeToWorkspaceNotifications()
    }

    var activeLabel: String {
        Self.formatClock(activeMs)
    }

    var secondsLabel: String {
        Date.now.formatted(.dateTime.second(.twoDigits))
    }

    var sleepLabel: String {
        Self.formatShort(sleepMs)
    }

    var startLabel: String {
        dayStart.formatted(date: .omitted, time: .shortened)
    }

    var dayLabel: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateFormat = "EEEE d"
        return formatter.string(from: Date()).capitalized
    }

    var updatedLabel: String {
        updatedAt.formatted(date: .omitted, time: .shortened)
    }

    var progress: Double {
        min(1, Double(activeMs) / (targetHours * 60 * 60 * 1000))
    }

    var progressText: String {
        let delta = Int(targetHours * 60 * 60 * 1000) - activeMs
        if delta <= 0 {
            return "сверх цели +\(Self.formatShort(-delta))"
        }
        return "до цели \(Self.formatShort(delta))"
    }

    var statusText: String {
        if !isAwakeNow {
            return "Сон"
        }
        if isIdleNow {
            return "Пауза"
        }
        return "Активен"
    }

    func refreshSnapshot() {
        let snapshot = WorkTimeSnapshotService.makeSnapshot()
        dayStart = snapshot.dayStart
        sleepMs = snapshot.sleepMs
        activeMs = snapshot.activeMs
        isAwakeNow = snapshot.isAwakeNow
        isIdleNow = isAwakeNow ? currentIdleSeconds() >= Self.idleThresholdSeconds : false
        lastTickAt = Date()
        updatedAt = Date()
    }

    private func startTimer() {
        timer = Timer.publish(every: 1, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.tick()
            }
    }

    private func tick() {
        rolloverIfNeeded()
        let now = Date()

        if isAwakeNow {
            let idleNow = currentIdleSeconds() >= Self.idleThresholdSeconds
            isIdleNow = idleNow

            if !idleNow {
                activeMs += Int(now.timeIntervalSince(lastTickAt) * 1000)
            }
        }

        lastTickAt = now
        updatedAt = now
    }

    private func rolloverIfNeeded() {
        if !Calendar.current.isDate(Date(), inSameDayAs: dayStart) {
            refreshSnapshot()
        }
    }

    private func subscribeToWorkspaceNotifications() {
        let center = NSWorkspace.shared.notificationCenter

        observers.append(
            center.addObserver(
                forName: NSWorkspace.willSleepNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                Task { @MainActor in
                    self?.handleWillSleep()
                }
            }
        )

        observers.append(
            center.addObserver(
                forName: NSWorkspace.didWakeNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                Task { @MainActor in
                    self?.refreshSnapshot()
                }
            }
        )
    }

    private func handleWillSleep() {
        tick()
        isAwakeNow = false
        isIdleNow = false
        updatedAt = Date()
    }

    private func currentIdleSeconds() -> TimeInterval {
        CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: .null)
    }

    private static func clampTargetHours(_ value: Double) -> Double {
        min(24, max(1, (value * 2).rounded() / 2))
    }

    private static func formatClock(_ totalMs: Int) -> String {
        let totalMinutes = max(0, totalMs / 60_000)
        return String(format: "%02d:%02d", totalMinutes / 60, totalMinutes % 60)
    }

    private static func formatShort(_ totalMs: Int) -> String {
        let totalMinutes = max(0, totalMs / 60_000)
        let hours = totalMinutes / 60
        let minutes = totalMinutes % 60
        return "\(hours) ч \(String(format: "%02d", minutes)) мин"
    }
}

private struct WorkSnapshot {
    let activeMs: Int
    let sleepMs: Int
    let isAwakeNow: Bool
    let dayStart: Date
}

private enum WorkTimeSnapshotService {
    static func makeSnapshot() -> WorkSnapshot {
        let now = Date()
        let dayStart = max(startOfDay(), bootTime() ?? now)
        let events = sleepWakeEvents()

        var sleepStartedAt: Date?
        var sleptMs = 0

        for event in events {
            if event.timestamp < dayStart {
                if event.kind == .sleep {
                    sleepStartedAt = event.timestamp
                } else {
                    sleepStartedAt = nil
                }
                continue
            }

            switch event.kind {
            case .sleep:
                if sleepStartedAt == nil {
                    sleepStartedAt = event.timestamp
                }
            case .wake:
                guard let currentSleepStartedAt = sleepStartedAt else { continue }
                let start = max(currentSleepStartedAt, dayStart)
                let end = min(event.timestamp, now)
                if end > start {
                    sleptMs += Int(end.timeIntervalSince(start) * 1000)
                }
                sleepStartedAt = nil
            }
        }

        if let sleepStartedAt, now > sleepStartedAt {
            let start = max(sleepStartedAt, dayStart)
            sleptMs += Int(now.timeIntervalSince(start) * 1000)
        }

        let totalWindowMs = max(0, Int(now.timeIntervalSince(dayStart) * 1000))
        let activeMs = max(0, totalWindowMs - sleptMs)

        return WorkSnapshot(
            activeMs: activeMs,
            sleepMs: sleptMs,
            isAwakeNow: sleepStartedAt == nil,
            dayStart: dayStart
        )
    }

    private static func startOfDay() -> Date {
        Calendar.current.startOfDay(for: Date())
    }

    private static func bootTime() -> Date? {
        let output = shell("who -b").trimmingCharacters(in: .whitespacesAndNewlines)
        let regex = try? NSRegularExpression(pattern: #"system boot\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}:\d{2})"#)
        guard
            let regex,
            let match = regex.firstMatch(in: output, range: NSRange(output.startIndex..., in: output)),
            let monthRange = Range(match.range(at: 1), in: output),
            let dayRange = Range(match.range(at: 2), in: output),
            let timeRange = Range(match.range(at: 3), in: output)
        else {
            return nil
        }

        let year = Calendar.current.component(.year, from: Date())
        let source = "\(year) \(output[monthRange]) \(output[dayRange]) \(output[timeRange])"
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy MMM d HH:mm"
        return formatter.date(from: source)
    }

    private static func sleepWakeEvents() -> [SleepWakeEvent] {
        shell("pmset -g log")
            .split(separator: "\n")
            .compactMap(SleepWakeEvent.init)
            .sorted { $0.timestamp < $1.timestamp }
    }

    private static func shell(_ command: String) -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = ["-lc", command]

        let outputPipe = Pipe()
        process.standardOutput = outputPipe
        process.standardError = Pipe()

        do {
            try process.run()
            process.waitUntilExit()
            let data = outputPipe.fileHandleForReading.readDataToEndOfFile()
            return String(decoding: data, as: UTF8.self)
        } catch {
            return ""
        }
    }
}

private struct SleepWakeEvent {
    enum Kind {
        case sleep
        case wake
    }

    let timestamp: Date
    let kind: Kind

    init?(line: Substring) {
        let lineString = String(line)
        guard lineString.contains("Sleep") || lineString.contains("Wake") else {
            return nil
        }

        let prefix = lineString.prefix(25)
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss Z"
        guard let timestamp = formatter.date(from: String(prefix)) else {
            return nil
        }

        if lineString.contains("Sleep") && lineString.contains("Entering Sleep") {
            self.timestamp = timestamp
            self.kind = .sleep
        } else if lineString.contains("Wake") && !lineString.contains("Wake Requests") {
            self.timestamp = timestamp
            self.kind = .wake
        } else {
            return nil
        }
    }
}
