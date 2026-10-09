import ActivityKit
import AppIntents
import CapgoWidgetKitShared
import SwiftUI
import WidgetKit

// Monday Quest widgets. The app pushes JSON state through @capgo/capacitor-widget-kit
// (activity "mq-today" for the home widget, "mq-session" for timed Live Activities);
// these views decode that state and draw the booklet look natively.

private let paper = Color(red: 0.965, green: 0.957, blue: 0.937)
private let ink = Color(red: 0.078, green: 0.078, blue: 0.078)
private let pencil = Color(red: 0.55, green: 0.54, blue: 0.52)
// Live Activities: iOS blends the background tint with the lock screen (translucent, darker in
// dark mode), so ink-on-paper loses contrast. Use an inverted opaque card instead.
private let laBackground = Color(red: 0.08, green: 0.08, blue: 0.08)
private let laText = Color(red: 0.965, green: 0.957, blue: 0.937)
private let laMuted = Color(red: 0.78, green: 0.77, blue: 0.74)

struct TodayState: Decodable {
    var title: String = "MONDAY QUEST"
    var short: String = ""
    var dayLabel: String = "MONDAY MORNING"
    var checked: Int = 0
    var days: [Bool] = Array(repeating: false, count: 7)
    var done: Bool = false
    var status: String = "none"
    var streak: Int = 0
    var number: Int = 0
}

struct SessionState: Decodable {
    var title: String = ""
    var subtitle: String = ""
    var short: String = "•"
    var startedAt: Double = 0
    var durationMs: Double = 0
    var endsAt: Double = 0
}

enum Store {
    static let bridge = CapgoTemplateWidgetBridge()

    static func decode<T: Decodable>(_ id: String, as _: T.Type) -> T? {
        guard let env = try? bridge.loadActivity(activityId: id) else { return nil }
        return try? JSONDecoder().decode(T.self, from: env.stateData)
    }
}

// MARK: - Home & lock screen widget

struct TodayEntry: TimelineEntry {
    let date: Date
    let state: TodayState
}

struct TodayProvider: TimelineProvider {
    func placeholder(in _: Context) -> TodayEntry {
        TodayEntry(date: .now, state: TodayState(title: "THE STROLLER", dayLabel: "DAY 3", checked: 2, days: [true, true, false, false, false, false, false]))
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        completion(Store.decode("mq-today", as: TodayState.self).map { TodayEntry(date: .now, state: $0) } ?? placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let entry = Store.decode("mq-today", as: TodayState.self).map { TodayEntry(date: .now, state: $0) } ?? placeholder(in: context)
        // refresh after midnight so the day label rolls over
        let tomorrow = Calendar.current.startOfDay(for: .now.addingTimeInterval(86_400))
        completion(Timeline(entries: [entry], policy: .after(tomorrow)))
    }
}

struct InkCheckShape: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.minX + r.width * 0.18, y: r.minY + r.height * 0.5))
        p.addCurve(to: CGPoint(x: r.minX + r.width * 0.4, y: r.minY + r.height * 0.78),
                   control1: CGPoint(x: r.minX + r.width * 0.27, y: r.minY + r.height * 0.56),
                   control2: CGPoint(x: r.minX + r.width * 0.33, y: r.minY + r.height * 0.64))
        p.addCurve(to: CGPoint(x: r.maxX + r.width * 0.06, y: r.minY - r.height * 0.02),
                   control1: CGPoint(x: r.minX + r.width * 0.53, y: r.minY + r.height * 0.52),
                   control2: CGPoint(x: r.minX + r.width * 0.72, y: r.minY + r.height * 0.25))
        return p
    }
}

struct CheckBox: View {
    let done: Bool
    var size: CGFloat = 44
    var body: some View {
        ZStack {
            Rectangle().stroke(ink, lineWidth: size * 0.07)
            if done {
                InkCheckShape().stroke(ink, style: StrokeStyle(lineWidth: size * 0.12, lineCap: .round, lineJoin: .round))
            }
        }
        .frame(width: size, height: size)
    }
}

struct WeekRow: View {
    let days: [Bool]
    var body: some View {
        HStack(spacing: 3) {
            ForEach(Array(days.prefix(7).enumerated()), id: \.offset) { _, on in
                Rectangle()
                    .fill(on ? ink : Color.clear)
                    .overlay(Rectangle().stroke(ink, lineWidth: 1.5))
                    .frame(width: 11, height: 11)
            }
        }
    }
}

struct TodayWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: TodayEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            Gauge(value: Double(entry.state.checked), in: 0 ... 7) {
                Text("MQ")
            } currentValueLabel: {
                Text("\(entry.state.checked)")
            }
            .gaugeStyle(.accessoryCircularCapacity)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.state.dayLabel).font(.caption2.weight(.heavy))
                Text(entry.state.title).font(.headline.weight(.black)).lineLimit(1)
                WeekRow(days: entry.state.days)
            }
        case .accessoryInline:
            Text("\(entry.state.title) · \(entry.state.checked)/7")
        default:
            home
        }
    }

    private var home: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(entry.state.dayLabel)
                .font(.system(size: 11, weight: .heavy))
                .kerning(0.6)
                .foregroundStyle(pencil)
            Text(entry.state.title)
                .font(.system(size: family == .systemSmall ? 19 : 22, weight: .black))
                .foregroundStyle(ink)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
            if family != .systemSmall, !entry.state.short.isEmpty {
                Text(entry.state.short)
                    .font(.system(size: 12))
                    .foregroundStyle(ink.opacity(0.75))
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    WeekRow(days: entry.state.days)
                    Text("\(entry.state.checked)/7").font(.system(size: 11, weight: .bold)).foregroundStyle(ink)
                }
                Spacer()
                if entry.state.status == "active" || entry.state.status == "finishing" {
                    if #available(iOS 17.0, *) {
                        Button(intent: CapgoTemplateActionIntent(activityId: "mq-today", actionId: "check", sourceId: "box")) {
                            CheckBox(done: entry.state.done)
                        }
                        .buttonStyle(.plain)
                        .disabled(entry.state.done)
                    } else {
                        CheckBox(done: entry.state.done)
                    }
                }
            }
        }
        .padding(2)
        .widgetURL(URL(string: "mondayquest://today"))
    }
}

struct TodayWidget: Widget {
    let kind = "MondayQuestToday"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            if #available(iOS 17.0, *) {
                TodayWidgetView(entry: entry).containerBackground(paper, for: .widget)
            } else {
                TodayWidgetView(entry: entry).padding().background(paper)
            }
        }
        .configurationDisplayName("Monday Quest")
        .description("This week's challenge. Tick today without opening the app.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: - Live Activity (walk, meditation, stretching, offline hour, fasting…)

@available(iOS 16.2, *)
struct SessionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CapgoTemplateActivityAttributes.self) { context in
            let s = Store.decode(context.attributes.activityId, as: SessionState.self) ?? SessionState()
            LockScreenSession(state: s)
                .activityBackgroundTint(laBackground.opacity(0.92))
                .activitySystemActionForegroundColor(laText)
                .widgetURL(URL(string: "mondayquest://today"))
        } dynamicIsland: { context in
            let s = Store.decode(context.attributes.activityId, as: SessionState.self) ?? SessionState()
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(s.short).font(.title2).foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: s.interval, countsDown: true)
                        .font(.title2.weight(.heavy).monospacedDigit())
                        .foregroundStyle(.white)
                        .frame(maxWidth: 90)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(s.title).font(.headline.weight(.black)).lineLimit(1).foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(timerInterval: s.interval, countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
                        .tint(.white)
                }
            } compactLeading: {
                Text(s.short).foregroundStyle(.white)
            } compactTrailing: {
                Text(timerInterval: s.interval, countsDown: true)
                    .monospacedDigit()
                    .foregroundStyle(.white)
                    .frame(maxWidth: 52)
            } minimal: {
                Text(s.short).foregroundStyle(.white)
            }
        }
    }
}

extension SessionState {
    var interval: ClosedRange<Date> {
        let start = Date(timeIntervalSince1970: startedAt / 1000)
        let end = Date(timeIntervalSince1970: max(endsAt, startedAt + 1000) / 1000)
        return start ... end
    }
}

@available(iOS 16.2, *)
struct LockScreenSession: View {
    let state: SessionState
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(state.title).font(.system(size: 18, weight: .black)).foregroundStyle(laText)
                    if !state.subtitle.isEmpty {
                        Text(state.subtitle).font(.system(size: 13)).foregroundStyle(laMuted)
                    }
                }
                Spacer()
                Text(timerInterval: state.interval, countsDown: true)
                    .font(.system(size: 34, weight: .heavy).monospacedDigit())
                    .foregroundStyle(laText)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 140, alignment: .trailing)
            }
            ProgressView(timerInterval: state.interval, countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
                .tint(laText)
        }
        .padding(18)
    }
}

@main
struct MondayQuestWidgets: WidgetBundle {
    var body: some Widget {
        TodayWidget()
        if #available(iOS 16.2, *) {
            SessionLiveActivity()
        }
    }
}
