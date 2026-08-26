import SwiftUI

struct TrackerMenuView: View {
    @EnvironmentObject private var store: TrackerStore
    @State private var searchText = ""
    @State private var timerDescription = ""
    @State private var selectedTask: TrackerTask?
    @State private var expandedTaskId: String?
    @FocusState private var isDescriptionFocused: Bool

    private var filteredTasks: [TrackerTask] {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return store.tasks
        }

        let query = searchText.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
        return store.tasks.filter { task in
            [task.title, task.project?.name, task.project?.code]
                .compactMap { $0 }
                .contains { value in
                    value.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
                        .contains(query)
                }
        }
    }

    private var filteredNoteSuggestions: TimerNoteSuggestions {
        let query = normalizedSearchValue(timerDescription)
        guard !query.isEmpty else { return store.noteSuggestions }

        let filter: ([TimerNoteSuggestion]) -> [TimerNoteSuggestion] = { suggestions in
            suggestions.filter { suggestion in
                normalizedSearchValue(suggestion.value).contains(query)
            }
        }

        return TimerNoteSuggestions(
            task: filter(store.noteSuggestions.task),
            frequent: filter(store.noteSuggestions.frequent)
        )
    }

    var body: some View {
        Group {
            if store.isAuthenticated {
                trackerContent
            } else {
                LoginView()
            }
        }
        .frame(width: 388, height: 560)
        .background(.ultraThinMaterial)
        .onChange(of: store.activeTimer) { activeTimer in
            guard activeTimer != nil else { return }
            selectedTask = nil
            timerDescription = ""
            isDescriptionFocused = false
        }
        .task(id: store.isAuthenticated) {
            guard store.isAuthenticated else { return }
            await store.restore()
        }
    }

    private var trackerContent: some View {
        VStack(spacing: 0) {
            header

            Divider()

            if store.isLoading && store.tasks.isEmpty {
                loadingState
            } else {
                VStack(spacing: 16) {
                    if let activeTimer = store.activeTimer {
                        ActiveTimerCard(timer: activeTimer) {
                            Task { await store.stopTimer() }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 16)
                    } else {
                        idleComposer
                            .padding(.horizontal, 16)
                            .padding(.top, 16)
                    }

                    if let errorMessage = store.errorMessage {
                        ErrorBanner(message: errorMessage)
                            .padding(.horizontal, 16)
                    }

                    taskList
                }
            }
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(Color.layersCoral)
                Image(systemName: "timer")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
            }
            .frame(width: 32, height: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text("Layers Tracker")
                    .font(.system(size: 14, weight: .semibold))

                if store.workspaces.count > 1 {
                    Picker(
                        "Workspace",
                        selection: Binding(
                            get: { store.selectedWorkspaceId ?? "" },
                            set: { workspaceId in
                                selectedTask = nil
                                expandedTaskId = nil
                                timerDescription = ""
                                Task { await store.selectWorkspace(workspaceId) }
                            }
                        )
                    ) {
                        ForEach(store.workspaces) { workspace in
                            Text(workspace.name).tag(workspace.id)
                        }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .controlSize(.mini)
                    .fixedSize()
                } else {
                    Text(store.workspaces.first?.name ?? "Workspace")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if store.activeTimer != nil {
                HStack(spacing: 5) {
                    Circle()
                        .fill(Color.layersCoral)
                        .frame(width: 7, height: 7)
                    Text("MERIAM")
                        .font(.system(size: 9, weight: .bold))
                        .tracking(0.7)
                }
                .foregroundStyle(Color.layersCoral)
            }

            Menu {
                Button("Obnoviť", systemImage: "arrow.clockwise") {
                    Task { await store.loadTracker(showLoading: true) }
                }
                Divider()
                Button("Odhlásiť sa", systemImage: "rectangle.portrait.and.arrow.right") {
                    store.logout()
                }
                Button("Ukončiť aplikáciu", systemImage: "power") {
                    NSApplication.shared.terminate(nil)
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.system(size: 16))
                    .foregroundStyle(.secondary)
                    .frame(width: 28, height: 28)
            }
            .menuStyle(.borderlessButton)
            .menuIndicator(.hidden)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private var idleComposer: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(selectedTask?.title ?? "Čo ideme robiť?")
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .lineLimit(1)
                    Text(selectedTask?.project?.name ?? "Vyberte úlohu a doplňte popis práce.")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer()
                if selectedTask != nil {
                    Button {
                        selectedTask = nil
                        timerDescription = ""
                        isDescriptionFocused = false
                        store.dismissNoteSuggestions()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(.tertiary)
                    }
                    .buttonStyle(.plain)
                    .help("Zrušiť výber úlohy")
                } else {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(Color.layersCoral)
                }
            }

            TextField("Popis práce (voliteľné)", text: $timerDescription)
                .textFieldStyle(.roundedBorder)
                .font(.system(size: 12))
                .focused($isDescriptionFocused)
                .disabled(selectedTask == nil)
                .onSubmit {
                    handleStartSelectedTask()
                }

            if selectedTask != nil {
                noteSuggestionContent

                HStack(spacing: 8) {
                    Text("Enter spustí meranie")
                        .font(.system(size: 9))
                        .foregroundStyle(.tertiary)

                    Spacer()

                    Button {
                        handleStartSelectedTask()
                    } label: {
                        HStack(spacing: 6) {
                            if store.isTimerChanging {
                                ProgressView()
                                    .controlSize(.mini)
                            } else {
                                Image(systemName: "play.fill")
                            }
                            Text(timerDescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                 ? "Spustiť"
                                 : "Spustiť s popisom")
                        }
                        .font(.system(size: 11, weight: .semibold))
                        .padding(.horizontal, 12)
                        .frame(height: 32)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.white)
                    .background(Color.layersCoral, in: RoundedRectangle(cornerRadius: 8))
                    .disabled(store.isTimerChanging)
                    .accessibilityLabel("Spustiť meranie pre \(selectedTask?.title ?? "vybranú úlohu")")
                }
            }
        }
        .padding(14)
        .background(Color.primary.opacity(0.045), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color.primary.opacity(0.08))
        }
    }

    @ViewBuilder
    private var noteSuggestionContent: some View {
        if store.isLoadingNoteSuggestions {
            HStack(spacing: 7) {
                ProgressView()
                    .controlSize(.mini)
                Text("Hľadám používané popisy…")
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
            }
            .frame(height: 24)
        } else if let error = store.noteSuggestionsError {
            Text(error)
                .font(.system(size: 10))
                .foregroundStyle(Color.orange)
                .lineLimit(2)
        } else if filteredNoteSuggestions.task.isEmpty && filteredNoteSuggestions.frequent.isEmpty {
            Text(timerDescription.isEmpty
                 ? "Zatiaľ bez návrhov. Nový popis ponúkneme nabudúce."
                 : "Žiadny zhodný popis – môžete použiť nový.")
                .font(.system(size: 10))
                .foregroundStyle(.secondary)
                .lineLimit(2)
        } else {
            if !filteredNoteSuggestions.task.isEmpty {
                SuggestionRow(
                    title: "V TEJTO ÚLOHE",
                    icon: "clock.arrow.circlepath",
                    suggestions: Array(filteredNoteSuggestions.task.prefix(6)),
                    selectedValue: timerDescription,
                    onSelect: handleSuggestionSelection
                )
            }

            if !filteredNoteSuggestions.frequent.isEmpty {
                SuggestionRow(
                    title: "ČASTÉ VO WORKSPACE",
                    icon: "sparkles",
                    suggestions: Array(filteredNoteSuggestions.frequent.prefix(6)),
                    selectedValue: timerDescription,
                    onSelect: handleSuggestionSelection
                )
            }
        }
    }

    private var taskList: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.tertiary)
                TextField("Hľadať úlohu alebo projekt", text: $searchText)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12))
                if !searchText.isEmpty {
                    Button {
                        searchText = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.tertiary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .frame(height: 36)
            .background(Color.primary.opacity(0.04), in: RoundedRectangle(cornerRadius: 9))
            .padding(.horizontal, 16)

            HStack {
                Text(store.activeTimer == nil ? "AKTÍVNE ÚLOHY" : "ĎALŠIE ÚLOHY")
                Spacer()
                Text("\(filteredTasks.count)")
            }
            .font(.system(size: 9, weight: .bold))
            .tracking(0.65)
            .foregroundStyle(.tertiary)
            .padding(.horizontal, 18)
            .padding(.top, 14)
            .padding(.bottom, 7)

            if filteredTasks.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 24))
                        .foregroundStyle(.tertiary)
                    Text(searchText.isEmpty ? "Žiadne aktívne úlohy" : "Nenašla sa žiadna úloha")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 4) {
                        ForEach(filteredTasks) { task in
                            VStack(spacing: 4) {
                                TaskRow(
                                    task: task,
                                    activeTimer: store.activeTimer,
                                    isSelected: selectedTask?.id == task.id,
                                    isExpanded: expandedTaskId == task.id,
                                    isDisabled: store.activeTimer != nil || store.isTimerChanging,
                                    onToggleExpanded: { handleTaskExpansion(task) },
                                    onPrepare: { handleTaskSelection(task) }
                                )

                                if expandedTaskId == task.id {
                                    TaskTimeHistoryPanel(
                                        result: store.taskTimeEntries[task.id],
                                        isLoading: store.loadingTaskTimeEntryIds.contains(task.id),
                                        errorMessage: store.taskTimeEntryErrors[task.id],
                                        activeTimer: store.activeTimer?.taskId == task.id
                                            ? store.activeTimer
                                            : nil,
                                        onRetry: {
                                            Task { await store.loadTaskTimeEntries(for: task.id, force: true) }
                                        }
                                    )
                                    .transition(.opacity.combined(with: .move(edge: .top)))
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.bottom, 12)
                }
            }
        }
        .frame(maxHeight: .infinity)
    }

    private var loadingState: some View {
        VStack(spacing: 12) {
            ProgressView()
                .controlSize(.small)
            Text("Načítavam úlohy…")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func handleTaskSelection(_ task: TrackerTask) {
        if selectedTask?.id != task.id {
            timerDescription = ""
        }
        selectedTask = task
        isDescriptionFocused = true
        Task { await store.loadNoteSuggestions(for: task.id) }
    }

    private func handleTaskExpansion(_ task: TrackerTask) {
        let isOpening = expandedTaskId != task.id

        withAnimation(.easeInOut(duration: 0.18)) {
            expandedTaskId = isOpening ? task.id : nil
        }

        if isOpening {
            Task { await store.loadTaskTimeEntries(for: task.id) }
        }
    }

    private func handleSuggestionSelection(_ suggestion: TimerNoteSuggestion) {
        timerDescription = suggestion.value
        isDescriptionFocused = true
    }

    private func handleStartSelectedTask() {
        guard let selectedTask, !store.isTimerChanging else { return }

        Task {
            if await store.startTimer(task: selectedTask, description: timerDescription) {
                self.selectedTask = nil
                timerDescription = ""
                isDescriptionFocused = false
            }
        }
    }

    private func normalizedSearchValue(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
    }
}

private struct SuggestionRow: View {
    let title: String
    let icon: String
    let suggestions: [TimerNoteSuggestion]
    let selectedValue: String
    let onSelect: (TimerNoteSuggestion) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Label(title, systemImage: icon)
                .font(.system(size: 8, weight: .bold))
                .tracking(0.5)
                .foregroundStyle(.tertiary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(suggestions) { suggestion in
                        Button {
                            onSelect(suggestion)
                        } label: {
                            HStack(spacing: 5) {
                                Text(suggestion.value)
                                    .lineLimit(1)
                                Text("\(suggestion.count)×")
                                    .monospacedDigit()
                                    .foregroundStyle(.tertiary)
                            }
                            .font(.system(size: 10, weight: .medium))
                            .padding(.horizontal, 8)
                            .frame(height: 25)
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(.primary)
                        .background(
                            isSelected(suggestion)
                                ? Color.layersCoral.opacity(0.13)
                                : Color.primary.opacity(0.055),
                            in: Capsule()
                        )
                        .overlay {
                            Capsule()
                                .stroke(
                                    isSelected(suggestion)
                                        ? Color.layersCoral.opacity(0.35)
                                        : Color.clear
                                )
                        }
                    }
                }
            }
        }
    }

    private func isSelected(_ suggestion: TimerNoteSuggestion) -> Bool {
        suggestion.value.compare(
            selectedValue,
            options: [.caseInsensitive, .diacriticInsensitive]
        ) == .orderedSame
    }
}

private struct ActiveTimerCard: View {
    let timer: ActiveTimer
    let onStop: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(timer.projectName.isEmpty ? "BEZ PROJEKTU" : timer.projectName.uppercased())
                        .font(.system(size: 9, weight: .bold))
                        .tracking(0.65)
                        .foregroundStyle(Color.layersCoral)
                    Text(timer.taskName)
                        .font(.system(size: 15, weight: .semibold))
                        .lineLimit(2)
                }
                Spacer()
                Circle()
                    .fill(Color.layersCoral)
                    .frame(width: 9, height: 9)
                    .shadow(color: Color.layersCoral.opacity(0.45), radius: 5)
                    .padding(.top, 4)
            }

            if let description = timer.description, !description.isEmpty {
                Label(description, systemImage: "text.alignleft")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            HStack(alignment: .center) {
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    Text(context.date.timeIntervalSince(timer.startedDate).trackerClock)
                        .font(.system(size: 31, weight: .semibold, design: .monospaced))
                        .contentTransition(.numericText())
                }

                Spacer()

                Button(action: onStop) {
                    Label("Zastaviť", systemImage: "stop.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .padding(.horizontal, 14)
                        .frame(height: 36)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .background(Color.layersCoral, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            }
        }
        .padding(16)
        .background(Color.layersCoral.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.layersCoral.opacity(0.22))
        }
    }
}

private struct TaskRow: View {
    let task: TrackerTask
    let activeTimer: ActiveTimer?
    let isSelected: Bool
    let isExpanded: Bool
    let isDisabled: Bool
    let onToggleExpanded: () -> Void
    let onPrepare: () -> Void

    var body: some View {
        HStack(spacing: 11) {
            Button(action: onToggleExpanded) {
                HStack(spacing: 11) {
                    Circle()
                        .fill(Color(hex: task.project?.color) ?? .secondary.opacity(0.45))
                        .frame(width: 8, height: 8)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(task.title)
                            .font(.system(size: 12, weight: .medium))
                            .lineLimit(1)
                        HStack(spacing: 5) {
                            Text(task.project?.name ?? "Bez projektu")
                            if let dueDate = task.dueDate {
                                Text("•")
                                Text(dueDate)
                            }

                            Spacer(minLength: 6)

                            trackedTime
                        }
                        .font(.system(size: 9))
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Image(systemName: "chevron.right")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.tertiary)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                }
            }
            .buttonStyle(.plain)
            .help(isExpanded ? "Skryť časové záznamy" : "Zobraziť časové záznamy")
            .accessibilityLabel("\(isExpanded ? "Zbaliť" : "Rozbaliť") úlohu \(task.title)")

            Button(action: onPrepare) {
                Image(systemName: "play.fill")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(isDisabled ? Color.secondary : Color.layersCoral)
                    .frame(width: 30, height: 30)
                    .background(
                        isSelected ? Color.layersCoral.opacity(0.14) : Color.primary.opacity(0.055),
                        in: Circle()
                    )
            }
            .buttonStyle(.plain)
            .disabled(isDisabled)
            .help(isDisabled ? "Najprv zastavte aktuálne meranie" : "Vybrať úlohu a doplniť popis")
        }
        .padding(.horizontal, 10)
        .frame(height: 56)
        .contentShape(RoundedRectangle(cornerRadius: 10))
        .background(
            isSelected ? Color.layersCoral.opacity(0.065) : Color.clear,
            in: RoundedRectangle(cornerRadius: 10)
        )
    }

    @ViewBuilder
    private var trackedTime: some View {
        HStack(spacing: 3) {
            Image(systemName: "clock")
            if let activeTimer, activeTimer.taskId == task.id {
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    Text(totalTrackedTime(at: context.date).trackerDuration)
                        .monospacedDigit()
                }
            } else {
                Text(task.trackedTimeLabel)
                    .monospacedDigit()
            }
        }
        .foregroundStyle(.secondary)
        .help("Celkom natrackované")
    }

    private func totalTrackedTime(at date: Date) -> TimeInterval {
        let savedTime = max(0, task.actualHours ?? 0) * 3_600
        guard let activeTimer, activeTimer.taskId == task.id else { return savedTime }
        return savedTime + max(0, date.timeIntervalSince(activeTimer.startedDate))
    }
}

private struct TaskTimeHistoryPanel: View {
    let result: TaskTimeEntries?
    let isLoading: Bool
    let errorMessage: String?
    let activeTimer: ActiveTimer?
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 7) {
                Label("ČASOVÉ ZÁZNAMY", systemImage: "clock.arrow.circlepath")
                Spacer()

                if let result {
                    Text("\(result.totalCount)")
                        .monospacedDigit()
                }

                Button(action: onRetry) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 9, weight: .semibold))
                        .frame(width: 22, height: 22)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
                .help("Obnoviť časové záznamy")
            }
            .font(.system(size: 8, weight: .bold))
            .tracking(0.55)
            .foregroundStyle(.tertiary)
            .padding(.horizontal, 11)
            .padding(.vertical, 9)

            Divider()

            if let activeTimer {
                ActiveTaskTimeEntryRow(timer: activeTimer)
                Divider().padding(.leading, 11)
            }

            if isLoading && result == nil {
                HStack(spacing: 8) {
                    ProgressView()
                        .controlSize(.mini)
                    Text("Načítavam presné časy…")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
            } else if let errorMessage, result == nil {
                VStack(spacing: 8) {
                    Label(errorMessage, systemImage: "exclamationmark.triangle")
                        .font(.system(size: 10))
                        .foregroundStyle(Color.orange)
                        .multilineTextAlignment(.center)
                    Button("Skúsiť znova", action: onRetry)
                        .buttonStyle(.link)
                        .font(.system(size: 10, weight: .medium))
                }
                .frame(maxWidth: .infinity)
                .padding(14)
            } else if let result, result.entries.isEmpty, activeTimer == nil {
                VStack(spacing: 6) {
                    Image(systemName: "clock.badge.questionmark")
                        .font(.system(size: 17))
                        .foregroundStyle(.tertiary)
                    Text("Na tejto úlohe ešte nie je natrackovaný čas.")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
            } else if let result {
                ForEach(Array(result.entries.enumerated()), id: \.element.id) { index, entry in
                    TaskTimeEntryRow(entry: entry)
                    if index < result.entries.count - 1 {
                        Divider().padding(.leading, 11)
                    }
                }

                if result.hasMore {
                    Text("Zobrazených posledných \(result.entries.count) z \(result.totalCount) záznamov.")
                        .font(.system(size: 9))
                        .foregroundStyle(.tertiary)
                        .frame(maxWidth: .infinity)
                        .padding(10)
                }
            }
        }
        .background(Color.primary.opacity(0.035), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(Color.primary.opacity(0.075))
        }
        .padding(.horizontal, 4)
    }
}

private struct TaskTimeEntryRow: View {
    let entry: TaskTimeEntry

    var body: some View {
        HStack(alignment: .top, spacing: 9) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(entry.dateLabel)
                        .fontWeight(.semibold)
                    Text("•")
                    Text(entry.userName)
                        .lineLimit(1)
                }
                .font(.system(size: 9))
                .foregroundStyle(.secondary)

                Text(entry.description?.isEmpty == false ? entry.description! : "Bez popisu")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(entry.description?.isEmpty == false ? .primary : .tertiary)
                    .lineLimit(2)

                Label(entry.timeRangeLabel, systemImage: "clock")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(.tertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Text(entry.durationLabel)
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(.secondary)
                .padding(.top, 1)
        }
        .padding(.horizontal, 11)
        .padding(.vertical, 9)
    }
}

private struct ActiveTaskTimeEntryRow: View {
    let timer: ActiveTimer

    var body: some View {
        HStack(alignment: .top, spacing: 9) {
            VStack(alignment: .leading, spacing: 4) {
                Label("PRÁVE BEŽÍ", systemImage: "record.circle.fill")
                    .font(.system(size: 8, weight: .bold))
                    .tracking(0.45)
                    .foregroundStyle(Color.layersCoral)

                Text(timer.description?.isEmpty == false ? timer.description! : "Bez popisu")
                    .font(.system(size: 10, weight: .medium))
                    .lineLimit(2)

                Text("Od \(Self.timeFormatter.string(from: timer.startedDate))")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(.tertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            TimelineView(.periodic(from: .now, by: 1)) { context in
                Text(context.date.timeIntervalSince(timer.startedDate).trackerClock)
                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color.layersCoral)
                    .contentTransition(.numericText())
            }
        }
        .padding(.horizontal, 11)
        .padding(.vertical, 9)
        .background(Color.layersCoral.opacity(0.055))
    }

    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "sk_SK")
        formatter.dateFormat = "HH:mm:ss"
        return formatter
    }()
}

struct ErrorBanner: View {
    let message: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Color.orange)
            Text(message)
                .font(.system(size: 11))
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(10)
        .background(Color.orange.opacity(0.1), in: RoundedRectangle(cornerRadius: 9))
    }
}

struct LayersPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(.white)
            .frame(height: 40)
            .background(
                Color.layersCoral.opacity(configuration.isPressed ? 0.82 : 1),
                in: RoundedRectangle(cornerRadius: 10, style: .continuous)
            )
            .scaleEffect(configuration.isPressed ? 0.99 : 1)
    }
}

extension Color {
    static let layersCoral = Color(red: 0.93, green: 0.27, blue: 0.22)

    init?(hex: String?) {
        guard let hex else { return nil }
        let value = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        guard value.count == 6, let integer = UInt64(value, radix: 16) else { return nil }
        self.init(
            red: Double((integer >> 16) & 0xFF) / 255,
            green: Double((integer >> 8) & 0xFF) / 255,
            blue: Double(integer & 0xFF) / 255
        )
    }
}
