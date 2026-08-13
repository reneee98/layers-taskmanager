import Foundation

@MainActor
final class TrackerStore: ObservableObject {
    @Published private(set) var session: AuthSession?
    @Published private(set) var user: TrackerUser?
    @Published private(set) var workspaces: [Workspace] = []
    @Published private(set) var tasks: [TrackerTask] = []
    @Published private(set) var activeTimer: ActiveTimer?
    @Published private(set) var noteSuggestions = TimerNoteSuggestions.empty
    @Published private(set) var suggestionsTaskId: String?
    @Published private(set) var isLoadingNoteSuggestions = false
    @Published private(set) var noteSuggestionsError: String?
    @Published private(set) var taskTimeEntries: [String: TaskTimeEntries] = [:]
    @Published private(set) var loadingTaskTimeEntryIds: Set<String> = []
    @Published private(set) var taskTimeEntryErrors: [String: String] = [:]
    @Published private(set) var isLoading = false
    @Published private(set) var isTimerChanging = false
    @Published var errorMessage: String?
    @Published var serverURL: String
    @Published var selectedWorkspaceId: String?

    private static let sessionAccount = "session"
    private static let serverURLKey = "layersTracker.serverURL"
    private static let workspaceKey = "layersTracker.workspaceId"
    private var noteSuggestionCache: [String: TimerNoteSuggestions] = [:]

    init() {
        let bundledURL = Bundle.main.object(forInfoDictionaryKey: "LayersAPIBaseURL") as? String
        serverURL = UserDefaults.standard.string(forKey: Self.serverURLKey)
            ?? bundledURL
            ?? "http://localhost:3001"
        selectedWorkspaceId = UserDefaults.standard.string(forKey: Self.workspaceKey)
        session = KeychainStore.load(AuthSession.self, account: Self.sessionAccount)
        user = session?.user
    }

    var isAuthenticated: Bool { session != nil }

    func restore() async {
        guard session != nil else { return }
        await loadTracker(showLoading: true)
    }

    func login(email: String, password: String) async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            let client = try APIClient(baseURLString: serverURL)
            let authenticatedSession: AuthSession = try await client.post(
                "/api/desktop/auth/login",
                body: LoginRequest(email: email, password: password)
            )
            try persist(authenticatedSession)
            UserDefaults.standard.set(client.baseURL.absoluteString, forKey: Self.serverURLKey)
            serverURL = client.baseURL.absoluteString
            await loadTracker(showLoading: false)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func logout() {
        KeychainStore.delete(account: Self.sessionAccount)
        session = nil
        user = nil
        workspaces = []
        tasks = []
        activeTimer = nil
        clearNoteSuggestions()
        clearTaskTimeEntries()
        errorMessage = nil
    }

    func loadTracker(showLoading: Bool = false) async {
        guard session != nil else { return }

        if showLoading { isLoading = true }
        defer { if showLoading { isLoading = false } }

        do {
            let workspaceId = selectedWorkspaceId
            let data: BootstrapData = try await authorized { client, token in
                try await client.get(
                    "/api/desktop/bootstrap",
                    accessToken: token,
                    queryItems: workspaceId.map { [URLQueryItem(name: "workspace_id", value: $0)] } ?? []
                )
            }

            user = data.user
            workspaces = data.workspaces
            tasks = data.tasks
            selectedWorkspaceId = data.currentWorkspaceId
            UserDefaults.standard.set(data.currentWorkspaceId, forKey: Self.workspaceKey)
            await refreshActiveTimer(silent: true)
        } catch {
            handle(error)
        }
    }

    func selectWorkspace(_ workspaceId: String) async {
        guard workspaceId != selectedWorkspaceId else { return }
        selectedWorkspaceId = workspaceId
        clearNoteSuggestions()
        clearTaskTimeEntries()
        UserDefaults.standard.set(workspaceId, forKey: Self.workspaceKey)
        await loadTracker(showLoading: true)
    }

    func loadNoteSuggestions(for taskId: String) async {
        suggestionsTaskId = taskId
        noteSuggestionsError = nil

        if let cachedSuggestions = noteSuggestionCache[taskId] {
            noteSuggestions = cachedSuggestions
            isLoadingNoteSuggestions = false
            return
        }

        guard let workspaceId = selectedWorkspaceId else {
            noteSuggestions = .empty
            noteSuggestionsError = "Nie je vybraný workspace."
            return
        }

        noteSuggestions = .empty
        isLoadingNoteSuggestions = true

        do {
            let suggestions: TimerNoteSuggestions = try await authorized { client, token in
                try await client.get(
                    "/api/desktop/time-entry-suggestions",
                    accessToken: token,
                    queryItems: [
                        URLQueryItem(name: "task_id", value: taskId),
                        URLQueryItem(name: "workspace_id", value: workspaceId),
                    ]
                )
            }

            guard suggestionsTaskId == taskId else { return }
            noteSuggestionCache[taskId] = suggestions
            noteSuggestions = suggestions
            isLoadingNoteSuggestions = false
        } catch {
            guard suggestionsTaskId == taskId else { return }
            noteSuggestions = .empty
            noteSuggestionsError = error.localizedDescription
            isLoadingNoteSuggestions = false
        }
    }

    func clearNoteSuggestions() {
        dismissNoteSuggestions()
        noteSuggestionCache.removeAll()
    }

    func dismissNoteSuggestions() {
        noteSuggestions = .empty
        suggestionsTaskId = nil
        noteSuggestionsError = nil
        isLoadingNoteSuggestions = false
    }

    func loadTaskTimeEntries(for taskId: String, force: Bool = false) async {
        guard force || taskTimeEntries[taskId] == nil else { return }
        guard !loadingTaskTimeEntryIds.contains(taskId) else { return }
        guard let workspaceId = selectedWorkspaceId else {
            taskTimeEntryErrors[taskId] = "Nie je vybraný workspace."
            return
        }

        loadingTaskTimeEntryIds.insert(taskId)
        taskTimeEntryErrors[taskId] = nil

        do {
            let result: TaskTimeEntries = try await authorized { client, token in
                try await client.get(
                    "/api/desktop/tasks/\(taskId)/time-entries",
                    accessToken: token,
                    queryItems: [URLQueryItem(name: "workspace_id", value: workspaceId)]
                )
            }
            taskTimeEntries[taskId] = result
        } catch {
            taskTimeEntryErrors[taskId] = error.localizedDescription
        }

        loadingTaskTimeEntryIds.remove(taskId)
    }

    func clearTaskTimeEntries() {
        taskTimeEntries.removeAll()
        loadingTaskTimeEntryIds.removeAll()
        taskTimeEntryErrors.removeAll()
    }

    func refreshActiveTimer(silent: Bool = false) async {
        guard session != nil else { return }

        do {
            activeTimer = try await authorized { client, token in
                try await client.getOptional("/api/timers/active", accessToken: token)
            }
        } catch {
            if !silent { handle(error) }
        }
    }

    func startTimer(task: TrackerTask, description: String) async -> Bool {
        guard activeTimer == nil else {
            errorMessage = "Najprv zastavte aktuálne meranie."
            return false
        }

        isTimerChanging = true
        errorMessage = nil
        defer { isTimerChanging = false }

        do {
            let note = description.trimmingCharacters(in: .whitespacesAndNewlines)
            let body = StartTimerRequest(
                taskId: task.id,
                taskName: task.title,
                projectId: task.projectId,
                projectName: task.project?.name ?? "Bez projektu",
                isExtra: false,
                description: note.isEmpty ? nil : note
            )
            let _: StartTimerResponse = try await authorized { client, token in
                try await client.post("/api/timers/start", body: body, accessToken: token)
            }
            await refreshActiveTimer(silent: false)
            return activeTimer != nil
        } catch {
            // The web app may have started a timer since the last background
            // refresh. Show that timer instead of leaving the tracker stale.
            await refreshActiveTimer(silent: true)
            handle(error)
            return false
        }
    }

    func stopTimer() async {
        guard let activeTimer else { return }
        let stoppedTaskId = activeTimer.taskId

        isTimerChanging = true
        errorMessage = nil
        defer { isTimerChanging = false }

        do {
            let _: StopTimerResponse = try await authorized { client, token in
                try await client.post("/api/timers/stop", accessToken: token)
            }
            noteSuggestionCache[activeTimer.taskId] = nil
            taskTimeEntries[stoppedTaskId] = nil
            taskTimeEntryErrors[stoppedTaskId] = nil
            self.activeTimer = nil
            await loadTracker(showLoading: false)
            await loadTaskTimeEntries(for: stoppedTaskId, force: true)
        } catch {
            handle(error)
        }
    }

    private func authorized<Value>(
        _ operation: (APIClient, String) async throws -> Value
    ) async throws -> Value {
        let client = try APIClient(baseURLString: serverURL)
        let token = try await validAccessToken(using: client)

        do {
            return try await operation(client, token)
        } catch let apiError as TrackerAPIError where apiError.isUnauthorized {
            let refreshed = try await refreshSession(using: client)
            return try await operation(client, refreshed.accessToken)
        }
    }

    private func validAccessToken(using client: APIClient) async throws -> String {
        guard let session else {
            throw TrackerAPIError.requestFailed(statusCode: 401, message: "Prihláste sa znova.")
        }

        if session.expiresAt > Date().timeIntervalSince1970 + 60 {
            return session.accessToken
        }

        return try await refreshSession(using: client).accessToken
    }

    private func refreshSession(using client: APIClient) async throws -> AuthSession {
        guard let session else {
            throw TrackerAPIError.requestFailed(statusCode: 401, message: "Prihláste sa znova.")
        }

        do {
            let refreshed: AuthSession = try await client.post(
                "/api/desktop/auth/refresh",
                body: RefreshRequest(refreshToken: session.refreshToken)
            )
            try persist(refreshed)
            return refreshed
        } catch {
            logout()
            throw error
        }
    }

    private func persist(_ newSession: AuthSession) throws {
        try KeychainStore.save(newSession, account: Self.sessionAccount)
        session = newSession
        user = newSession.user
    }

    private func handle(_ error: Error) {
        errorMessage = error.localizedDescription
        if let apiError = error as? TrackerAPIError, apiError.isUnauthorized {
            logout()
            errorMessage = "Relácia vypršala. Prihláste sa znova."
        }
    }
}
