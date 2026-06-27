import WidgetKit
import SwiftUI
import AppIntents

struct HeatmapCell: Identifiable {
    let id = UUID()
    let dateStr: String
    let progress: Double
    let isToday: Bool
    let isFuture: Bool
}

// -------------------------------------------------------------------------
// TIMELINE PROVIDER
// -------------------------------------------------------------------------

func fetchHabitAsync(apiUrl: String, token: String, habitId: String) async -> HabitDTO? {
    guard let url = URL(string: "\(apiUrl)/api/habit/\(habitId)") else {
        return nil
    }
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    do {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            return nil
        }
        let decoder = JSONDecoder()
        let habit = try decoder.decode(HabitDTO.self, from: data)
        return habit
    } catch {
        print("Error fetching habit details: \(error)")
        return nil
    }
}

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), habit: placeholderHabit)
    }

    func snapshot(for configuration: SelectHabitIntent, in context: Context) async -> SimpleEntry {
        SimpleEntry(date: Date(), habit: placeholderHabit)
    }

    func timeline(for configuration: SelectHabitIntent, in context: Context) async -> Timeline<SimpleEntry> {
        let sharedDefaults = UserDefaults(suiteName: "group.com.doparatio.app")
        let apiUrl = sharedDefaults?.string(forKey: "api_url") ?? "http://localhost:8080"
        let token = sharedDefaults?.string(forKey: "auth_token") ?? ""
        
        // Parse selected habit from the String parameter "id|displayName"
        let selection = configuration.habitSelection ?? ""
        let parsed = parseHabitOption(selection)
        let habitId = parsed.id
        
        sharedDefaults?.set("timeline selection: '\(selection)' → id: \(habitId)", forKey: "debug_timeline_habit")
        
        if habitId.isEmpty || token.isEmpty {
            let entry = SimpleEntry(date: Date(), habit: nil)
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(300)))
            return timeline
        }
        
        let habit = await fetchHabitAsync(apiUrl: apiUrl, token: token, habitId: habitId)
        let entry = SimpleEntry(date: Date(), habit: habit)
        let refreshDate = Date().addingTimeInterval(900)
        let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
        return timeline
    }
}


struct SimpleEntry: TimelineEntry {
    let date: Date
    let habit: HabitDTO?
}

// -------------------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------------------

func getHeatmapCells(logs: [HabitLogDTO]?, colorHex: String, logType: String, targetValue: Int) -> [[HeatmapCell]] {
    let calendar = Calendar.current
    let today = Date()
    
    // Find Monday of current week
    var components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today)
    components.weekday = 2 // Monday
    guard let currentMonday = calendar.date(from: components) else { return [] }
    
    var columns: [[HeatmapCell]] = []
    let numWeeks = 28
    
    for w in 0..<numWeeks {
        var weekCells: [HeatmapCell] = []
        for d in 0..<7 {
            let offsetWeeks = w - (numWeeks - 1)
            if let date = calendar.date(byAdding: .day, value: offsetWeeks * 7 + d, to: currentMonday) {
                let formatter = DateFormatter()
                formatter.dateFormat = "yyyy-MM-dd"
                let dateStr = formatter.string(from: date)
                
                let isToday = calendar.isDate(date, inSameDayAs: today)
                let isFuture = date > today
                
                var progress: Double = 0.0
                if !isFuture, let log = logs?.first(where: { $0.logDate == dateStr }) {
                    if logType == "BINARY" {
                        progress = 1.0
                    } else {
                        let val = log.currentValue ?? 0
                        progress = targetValue > 0 ? min(Double(val) / Double(targetValue), 1.0) : 0.0
                    }
                }
                
                weekCells.append(HeatmapCell(dateStr: dateStr, progress: progress, isToday: isToday, isFuture: isFuture))
            }
        }
        columns.append(weekCells)
    }
    return columns
}

func calculateStreak(logs: [HabitLogDTO]) -> Int {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    
    let completedDates = logs.compactMap { log -> Date? in
        return formatter.date(from: log.logDate)
    }.sorted()
    
    if completedDates.isEmpty { return 0 }
    
    var currentStreak = 0
    var lastDate: Date? = nil
    let calendar = Calendar.current
    
    for date in completedDates {
        if let last = lastDate {
            let components = calendar.dateComponents([.day], from: last, to: date)
            if components.day == 1 {
                currentStreak += 1
            } else if let day = components.day, day > 1 {
                currentStreak = 1
            }
        } else {
            currentStreak = 1
        }
        lastDate = date
    }
    
    if let last = lastDate {
        let components = calendar.dateComponents([.day], from: last, to: Date())
        if let day = components.day, day > 1 {
            return 0
        }
    }
    
    return currentStreak
}

// -------------------------------------------------------------------------
// VIEWS
// -------------------------------------------------------------------------

let placeholderHabit = HabitDTO(
    id: 1,
    name: "Read Books",
    icon: "📚",
    color: "E5A93C",
    logType: "BINARY",
    targetValue: 1,
    logs: [
        HabitLogDTO(id: 1, logDate: "2026-06-18", currentValue: 1)
    ]
)

struct HabitWidgetEntryView : View {
    var entry: Provider.Entry
    
    var body: some View {
        if let habit = entry.habit {
            VStack(alignment: .leading, spacing: 10) {
                // Top row: Icon, Name and Streak
                HStack(alignment: .center, spacing: 10) {
                    Text(habit.icon)
                        .font(.system(size: 24))
                        .padding(6)
                        .background(Color(hex: habit.color).opacity(0.15))
                        .cornerRadius(12)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(habit.name)
                            .font(.system(size: 14, weight: .bold))
                            .lineLimit(1)
                            .foregroundColor(.primary)
                        
                        Text("🔥 \(calculateStreak(logs: habit.logs ?? [])) days")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.orange)
                    }
                    
                    Spacer()
                }
                
                Spacer(minLength: 0)
                
                // Bottom row: Heatmap Grid spanning full width
                HStack(spacing: 2) {
                    let columns = getHeatmapCells(
                        logs: habit.logs,
                        colorHex: habit.color,
                        logType: habit.logType,
                        targetValue: habit.targetValue
                    )
                    
                    ForEach(0..<columns.count, id: \.self) { colIdx in
                        VStack(spacing: 2) {
                            ForEach(columns[colIdx]) { cell in
                                cellView(cell: cell, color: Color(hex: habit.color))
                                    .aspectRatio(1, contentMode: .fit)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                    }
                }
            }
            .padding(14)
            .widgetURL(URL(string: "doparatio://habit/\(habit.id)"))
        } else {
            VStack(spacing: 8) {
                Text("DopaRatio")
                    .font(.system(size: 16, weight: .bold))
                Text("Long press widget and select a habit to display")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
        }
    }
    
    @ViewBuilder
    func cellView(cell: HeatmapCell, color: Color) -> some View {
        if cell.isFuture {
            RoundedRectangle(cornerRadius: 1.5)
                .fill(Color.clear)
        } else {
            RoundedRectangle(cornerRadius: 1.5)
                .fill(cell.progress > 0 ? color.opacity(0.15 + 0.85 * cell.progress) : Color(.systemGray4))
                .overlay(
                    RoundedRectangle(cornerRadius: 1.5)
                        .stroke(Color.orange, lineWidth: cell.isToday ? 1 : 0)
                )
        }
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// -------------------------------------------------------------------------
// WIDGET MAIN ENTRY POINT
// -------------------------------------------------------------------------

@main
struct HabitWidget: Widget {
    let kind: String = "HabitWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectHabitIntent.self, provider: Provider()) { entry in
            HabitWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Habit Heatmap")
        .description("Displays the completion heatmap for a selected habit.")
        .supportedFamilies([.systemMedium])
    }
}
