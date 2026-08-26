import AppKit
import Combine
import SwiftUI

@main
struct LayersTrackerApp: App {
    @NSApplicationDelegateAdaptor(TrackerAppDelegate.self) private var appDelegate

    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}

@MainActor
private final class TrackerAppDelegate: NSObject, NSApplicationDelegate {
    private let store = TrackerStore()
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let popover = NSPopover()
    private var activeTimerSubscription: AnyCancellable?
    private var clockTimer: Timer?
    private var timerSyncTimer: Timer?
    private var testWindow: NSWindow?

    func applicationDidFinishLaunching(_ notification: Notification) {
        configurePopover()
        configureStatusItem()
        observeActiveTimer()
        startClock()
        startTimerSync()
        configureTestWindowIfNeeded()
        updateStatusItem()

        if store.isAuthenticated {
            Task { await store.restore() }
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        clockTimer?.invalidate()
        timerSyncTimer?.invalidate()
    }

    private func configurePopover() {
        popover.behavior = .transient
        popover.animates = false
        popover.contentSize = NSSize(width: 388, height: 560)
        popover.contentViewController = NSHostingController(
            rootView: TrackerMenuView().environmentObject(store)
        )
    }

    private func configureStatusItem() {
        guard let button = statusItem.button else { return }

        button.target = self
        button.action = #selector(handleStatusItemClick)
        button.sendAction(on: [.leftMouseUp])
        button.imagePosition = .imageLeading
        button.imageScaling = .scaleProportionallyDown
    }

    private func observeActiveTimer() {
        activeTimerSubscription = store.$activeTimer
            .removeDuplicates()
            .sink { [weak self] _ in
                self?.updateStatusItem()
            }
    }

    private func startClock() {
        let timer = Timer(timeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.updateStatusItem()
            }
        }
        timer.tolerance = 0.15
        RunLoop.main.add(timer, forMode: .common)
        clockTimer = timer
    }

    private func startTimerSync() {
        let timer = Timer(timeInterval: 5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.store.refreshActiveTimer(silent: true)
            }
        }
        timer.tolerance = 0.5
        RunLoop.main.add(timer, forMode: .common)
        timerSyncTimer = timer
    }

    private func configureTestWindowIfNeeded() {
        guard ProcessInfo.processInfo.arguments.contains("--test-window") else { return }

        let controller = NSHostingController(
            rootView: TrackerMenuView().environmentObject(store)
        )
        let window = NSWindow(contentViewController: controller)
        window.title = "Layers Tracker – test"
        window.styleMask = [.titled, .closable, .miniaturizable]
        window.setContentSize(NSSize(width: 388, height: 560))
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApplication.shared.activate(ignoringOtherApps: true)
        testWindow = window
    }

    private func updateStatusItem(at date: Date = Date()) {
        guard let button = statusItem.button else { return }

        if let timer = store.activeTimer {
            let taskTitle = compactTaskTitle(timer.taskName)
            let elapsed = date.timeIntervalSince(timer.startedDate).trackerClock
            let statusText = "\(taskTitle) · \(elapsed)"
            let image = NSImage(systemSymbolName: "record.circle.fill", accessibilityDescription: "Meranie prebieha")
            image?.isTemplate = true

            button.image = image
            button.attributedTitle = NSAttributedString(
                string: statusText,
                attributes: [
                    .font: NSFont.monospacedDigitSystemFont(
                        ofSize: NSFont.systemFontSize,
                        weight: .medium
                    )
                ]
            )
            button.toolTip = "\(timer.taskName) – \(elapsed)"
            button.setAccessibilityLabel("Meriam \(timer.taskName), \(elapsed)")
            testWindow?.title = "Layers Tracker – test · \(statusText)"
        } else {
            let image = NSImage(systemSymbolName: "timer", accessibilityDescription: "Layers Tracker")
            image?.isTemplate = true

            button.image = image
            button.attributedTitle = NSAttributedString(string: "")
            button.toolTip = "Layers Tracker"
            button.setAccessibilityLabel("Layers Tracker")
            testWindow?.title = "Layers Tracker – test"
        }
    }

    private func compactTaskTitle(_ title: String) -> String {
        let normalized = title
            .replacingOccurrences(of: "\n", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let maximumLength = 28

        guard normalized.count > maximumLength else {
            return normalized.isEmpty ? "Bez názvu" : normalized
        }

        return String(normalized.prefix(maximumLength - 1)) + "…"
    }

    @objc
    private func handleStatusItemClick() {
        guard let button = statusItem.button else { return }

        if popover.isShown {
            popover.performClose(nil)
            return
        }

        popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        popover.contentViewController?.view.window?.makeKey()
    }
}
