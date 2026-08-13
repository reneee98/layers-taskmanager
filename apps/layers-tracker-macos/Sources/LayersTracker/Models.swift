import Foundation

struct APIEnvelope<Value: Decodable>: Decodable {
    let success: Bool
    let data: Value?
    let error: String?
}

struct AuthSession: Codable, Equatable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: TimeInterval
    let user: TrackerUser
}

struct TrackerUser: Codable, Equatable {
    let id: String
    let email: String?
}

struct Workspace: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let role: String
}

struct TaskProject: Codable, Equatable {
    let id: String
    let name: String
    let code: String?
    let color: String?
}

struct TrackerTask: Codable, Identifiable, Equatable {
    let id: String
    let title: String
    let status: String
    let priority: String
    let dueDate: String?
    let updatedAt: String
    let actualHours: Double?
    let projectId: String?
    let project: TaskProject?

    var trackedTimeLabel: String {
        TimeInterval(max(0, actualHours ?? 0) * 3_600).trackerDuration
    }
}

struct BootstrapData: Decodable {
    let user: TrackerUser
    let workspaces: [Workspace]
    let currentWorkspaceId: String
    let tasks: [TrackerTask]
}

struct ActiveTimer: Decodable, Equatable {
    let id: String
    let taskId: String
    let taskName: String
    let projectName: String
    let projectId: String
    let startedAt: String
    let duration: Int
    let isExtra: Bool?
    let description: String?

    var startedDate: Date {
        ISO8601DateFormatter.layers.date(from: startedAt)
            ?? ISO8601DateFormatter().date(from: startedAt)
            ?? Date().addingTimeInterval(TimeInterval(-duration))
    }
}

struct StartTimerResponse: Decodable {
    let timerId: String
}

struct StopTimerResponse: Decodable {
    let duration: Int?
    let hours: Double?
}

struct TimerNoteSuggestion: Decodable, Identifiable, Equatable {
    let value: String
    let count: Int
    let lastUsedAt: String?

    var id: String {
        value.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
    }
}

struct TimerNoteSuggestions: Decodable, Equatable {
    let task: [TimerNoteSuggestion]
    let frequent: [TimerNoteSuggestion]

    static let empty = TimerNoteSuggestions(task: [], frequent: [])
}

struct TaskTimeEntry: Decodable, Identifiable, Equatable {
    let id: String
    let userId: String
    let userName: String
    let hours: Double
    let date: String
    let description: String?
    let startTime: String?
    let endTime: String?
    let createdAt: String

    var dateLabel: String {
        guard let parsedDate = Self.storageDateFormatter.date(from: date) else { return date }
        return Self.displayDateFormatter.string(from: parsedDate)
    }

    var timeRangeLabel: String {
        guard let startTime = normalizedTime(startTime), let endTime = normalizedTime(endTime) else {
            return "Ručný záznam"
        }
        return "\(startTime) – \(endTime)"
    }

    var durationLabel: String {
        if let exactDuration {
            return exactDuration.trackerClock
        }
        return TimeInterval(max(0, hours) * 3_600).trackerClockRounded
    }

    private var exactDuration: TimeInterval? {
        guard
            let startSeconds = secondsSinceMidnight(startTime),
            let endSeconds = secondsSinceMidnight(endTime)
        else { return nil }

        let elapsedSeconds = endSeconds >= startSeconds
            ? endSeconds - startSeconds
            : 86_400 - startSeconds + endSeconds
        return TimeInterval(elapsedSeconds)
    }

    private func normalizedTime(_ value: String?) -> String? {
        guard let value, !value.isEmpty else { return nil }

        if value.range(of: #"^\d{2}:\d{2}"#, options: .regularExpression) != nil {
            return String(value.split(separator: ".", maxSplits: 1).first ?? Substring(value)).prefix(8).description
        }

        guard let date = ISO8601DateFormatter.layers.date(from: value)
            ?? ISO8601DateFormatter().date(from: value) else { return nil }
        return Self.displayTimeFormatter.string(from: date)
    }

    private func secondsSinceMidnight(_ value: String?) -> Int? {
        guard let normalized = normalizedTime(value) else { return nil }
        let components = normalized.split(separator: ":").compactMap { Int($0) }
        guard components.count >= 2 else { return nil }

        let hours = components[0]
        let minutes = components[1]
        let seconds = components.count > 2 ? components[2] : 0
        guard (0...23).contains(hours), (0...59).contains(minutes), (0...59).contains(seconds) else {
            return nil
        }
        return hours * 3_600 + minutes * 60 + seconds
    }

    private static let storageDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let displayDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "sk_SK")
        formatter.dateFormat = "d. M. yyyy"
        return formatter
    }()

    private static let displayTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "sk_SK")
        formatter.dateFormat = "HH:mm:ss"
        return formatter
    }()
}

struct TaskTimeEntries: Decodable, Equatable {
    let entries: [TaskTimeEntry]
    let totalCount: Int
    let hasMore: Bool
}

struct EmptyResponse: Decodable {}

struct StartTimerRequest: Encodable {
    let taskId: String
    let taskName: String
    let projectId: String?
    let projectName: String
    let isExtra: Bool
    let description: String?
}

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct RefreshRequest: Encodable {
    let refreshToken: String
}

extension ISO8601DateFormatter {
    static let layers: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}

extension TimeInterval {
    var trackerClock: String {
        let totalSeconds = max(0, Int(self))
        let hours = totalSeconds / 3_600
        let minutes = (totalSeconds % 3_600) / 60
        let seconds = totalSeconds % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }

    var trackerDuration: String {
        let totalMinutes = max(0, Int((self / 60).rounded()))
        let hours = totalMinutes / 60
        let minutes = totalMinutes % 60

        if hours == 0 {
            return "\(totalMinutes) min"
        }

        if minutes == 0 {
            return "\(hours) h"
        }

        return "\(hours) h \(minutes) min"
    }

    var trackerClockRounded: String {
        let totalSeconds = max(0, Int(rounded()))
        let hours = totalSeconds / 3_600
        let minutes = (totalSeconds % 3_600) / 60
        let seconds = totalSeconds % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }
}
