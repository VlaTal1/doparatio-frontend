import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

@available(iOS 15.0, *)
class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        
        let store = ManagedSettingsStore()
        let defaults = UserDefaults(suiteName: "group.com.doparatio.app")
        let totalLimitEventName = DeviceActivityEvent.Name("DopaRatioTotalLimit")
        let periodicSyncEventName = DeviceActivityEvent.Name("DopaRatioPeriodicSync")
        
        if event == totalLimitEventName {
            // Block apps immediately
            if let data = defaults?.data(forKey: "blocked_apps_selection"),
               let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
                store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
                store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : ShieldSettings.ActivityCategoryPolicy.specific(selection.categoryTokens)
                store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
            }
            defaults?.set("0", forKey: "time_balance")
            stopDeviceActivityMonitoring()
            
            // Sync with backend (balance = 0)
            syncBalance(subtract: 0, isZero: true)
        } else if event == periodicSyncEventName {
            // Subtract 60 seconds (1 minute)
            let balanceStr = defaults?.string(forKey: "time_balance") ?? "0"
            var balance = Int(balanceStr) ?? 0
            
            if balance > 0 {
                let subtract = min(balance, 60)
                balance = max(0, balance - 60)
                defaults?.set(String(balance), forKey: "time_balance")
                
                // Sync with server
                syncBalance(subtract: subtract, isZero: balance <= 0)
                
                // Restart monitoring with remaining balance
                if balance > 0 {
                    if let data = defaults?.data(forKey: "blocked_apps_selection"),
                       let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
                        startDeviceActivityMonitoring(seconds: balance, selection: selection)
                    }
                } else {
                    // Block apps
                    if let data = defaults?.data(forKey: "blocked_apps_selection"),
                       let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
                        store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
                        store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : ShieldSettings.ActivityCategoryPolicy.specific(selection.categoryTokens)
                        store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
                    }
                    stopDeviceActivityMonitoring()
                }
            }
        }
    }
    
    private func syncBalance(subtract: Int, isZero: Bool) {
        let defaults = UserDefaults(suiteName: "group.com.doparatio.app")
        guard let token = defaults?.string(forKey: "auth_token"),
              let apiUrl = defaults?.string(forKey: "api_url") else { return }
        
        let urlString = isZero ? "\(apiUrl)/api/balance/subtract?seconds=0" : "\(apiUrl)/api/balance/subtract?seconds=\(subtract)"
        guard let url = URL(string: urlString) else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let semaphore = DispatchSemaphore(value: 0)
        let task = URLSession.shared.dataTask(with: request) { _, _, _ in
            semaphore.signal()
        }
        task.resume()
        _ = semaphore.wait(timeout: .now() + 5.0) // Keep extension alive for up to 5 seconds to complete request
    }
    
    private func startDeviceActivityMonitoring(seconds: Int, selection: FamilyActivitySelection) {
        if #available(iOS 16.0, *) {
            let center = DeviceActivityCenter()
            
            let schedule = DeviceActivitySchedule(
                intervalStart: DateComponents(hour: 0, minute: 0),
                intervalEnd: DateComponents(hour: 23, minute: 59),
                repeats: true
            )
            
            // iOS DeviceActivityEvent threshold ignores 'second' component and only respects 'minute' or higher
            let minutes = max(1, seconds / 60)
            
            let totalLimitEvent = DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                webDomains: selection.webDomainTokens,
                threshold: DateComponents(minute: minutes)
            )
            
            let periodicSyncEvent = DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                webDomains: selection.webDomainTokens,
                threshold: DateComponents(minute: 1) // 1 minute is the minimum reliable threshold supported by iOS
            )
            
            do {
                try center.startMonitoring(
                    DeviceActivityName("DopaRatioActivity"),
                    during: schedule,
                    events: [
                        DeviceActivityEvent.Name("DopaRatioTotalLimit"): totalLimitEvent,
                        DeviceActivityEvent.Name("DopaRatioPeriodicSync"): periodicSyncEvent
                    ]
                )
            } catch {
                print("Failed to start DeviceActivity monitoring: \(error)")
            }
        }
    }
    
    private func stopDeviceActivityMonitoring() {
        if #available(iOS 16.0, *) {
            let center = DeviceActivityCenter()
            center.stopMonitoring([DeviceActivityName("DopaRatioActivity")])
        }
    }
}
