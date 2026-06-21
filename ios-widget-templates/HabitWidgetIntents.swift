import WidgetKit
import SwiftUI
import AppIntents

struct HabitDTO: Codable {
    let id: Int
    let name: String
    let icon: String
    let color: String
    let logType: String
    let targetValue: Int
    let logs: [HabitLogDTO]?
}

struct HabitLogDTO: Codable {
    let id: Int?
    let logDate: String
    let currentValue: Int?
}

// -------------------------------------------------------------------------
// CACHED HABIT MODEL (for UserDefaults cache)
// -------------------------------------------------------------------------

struct CachedHabit: Codable {
    let id: Int
    let name: String
    let icon: String
}

// -------------------------------------------------------------------------
// DYNAMIC OPTIONS PROVIDER (replaces AppEntity + EntityQuery)
// -------------------------------------------------------------------------

struct HabitOptionsProvider: DynamicOptionsProvider {
    func results() async throws -> [String] {
        let habits = loadCachedHabits()
        return habits.map { "\($0.id)|\($0.icon) \($0.name)" }
    }
}

func loadCachedHabits() -> [CachedHabit] {
    let sharedDefaults = UserDefaults(suiteName: "group.com.doparatio.app")
    guard let jsonString = sharedDefaults?.string(forKey: "widget_habits_cache"),
          let data = jsonString.data(using: .utf8),
          let habits = try? JSONDecoder().decode([CachedHabit].self, from: data) else {
        return []
    }
    return habits
}

/// Parse "1|🏃 Morning run" → ("1", "🏃 Morning run")
func parseHabitOption(_ value: String) -> (id: String, displayName: String) {
    let parts = value.split(separator: "|", maxSplits: 1)
    if parts.count == 2 {
        return (String(parts[0]), String(parts[1]))
    }
    return (value, value)
}

// -------------------------------------------------------------------------
// WIDGET CONFIGURATION INTENT
// -------------------------------------------------------------------------

public struct SelectHabitIntent: WidgetConfigurationIntent {
    public static var title: LocalizedStringResource = "Select Habit"
    public static var description = IntentDescription("Choose a habit to show on the heatmap widget.")

    @Parameter(title: "Habit", optionsProvider: HabitOptionsProvider())
    public var habitSelection: String?

    public init() {}
}
