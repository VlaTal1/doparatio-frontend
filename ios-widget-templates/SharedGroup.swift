import Foundation
import WidgetKit
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI
import React

@available(iOS 16.0, *)
struct AppPickerView: View {
    @Binding var selection: FamilyActivitySelection
    var onDone: () -> Void
    var onCancel: () -> Void
    
    var body: some View {
        NavigationView {
            VStack {
                FamilyActivityPicker(headerText: "Выберите приложения для блокировки", selection: $selection)
            }
            .navigationTitle("Блокировка приложений")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Отмена") {
                        onCancel()
                    }
                    .foregroundColor(Color(red: 122/255, green: 138/255, blue: 130/255))
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Готово") {
                        onDone()
                    }
                    .foregroundColor(Color(red: 229/255, green: 169/255, blue: 60/255))
                }
            }
        }
    }
}

@objc(SharedGroup)
class SharedGroup: NSObject {
  
  @objc
  func setString(_ key: String, value: String, suiteName: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if let defaults = UserDefaults(suiteName: suiteName) {
      defaults.set(value, forKey: key)
      WidgetCenter.shared.reloadAllTimelines()
      
      // Update shield dynamically if time_balance changes
      if key == "time_balance", #available(iOS 16.0, *) {
        let isEnabled = defaults.bool(forKey: "app_blocker_enabled")
        if isEnabled {
          let balance = Int(value) ?? 0
          let store = ManagedSettingsStore()
          
          if balance <= 0 {
            if let data = defaults.data(forKey: "blocked_apps_selection"),
               let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
              store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
              store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : ShieldSettings.ActivityCategoryPolicy.specific(selection.categoryTokens)
              store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
            }
            stopDeviceActivityMonitoring()
          } else {
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            store.shield.webDomains = nil
            
            if let data = defaults.data(forKey: "blocked_apps_selection"),
               let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
              startDeviceActivityMonitoring(seconds: balance, selection: selection)
            }
          }
        }
      }
      
      resolve(true)
    } else {
      reject("FAIL", "Could not initialize UserDefaults with suite \(suiteName)", nil)
    }
  }

  @objc
  func getString(_ key: String, suiteName: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if let defaults = UserDefaults(suiteName: suiteName) {
      let value = defaults.string(forKey: key) ?? ""
      resolve(value)
    } else {
      reject("FAIL", "Could not initialize UserDefaults with suite \(suiteName)", nil)
    }
  }

  @objc
  func reloadAllTimelines(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    WidgetCenter.shared.reloadAllTimelines()
    resolve(true)
  }

  @objc
  func isBlockerEnabled(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let defaults = UserDefaults(suiteName: "group.com.doparatio.app")
    let isEnabled = defaults?.bool(forKey: "app_blocker_enabled") ?? false
    resolve(isEnabled)
  }

  @objc
  func setBlockerEnabled(_ enabled: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let defaults = UserDefaults(suiteName: "group.com.doparatio.app")
    defaults?.set(enabled, forKey: "app_blocker_enabled")
    
    if #available(iOS 16.0, *) {
      let store = ManagedSettingsStore()
      if enabled {
        let balanceStr = defaults?.string(forKey: "time_balance") ?? "0"
        let balance = Int(balanceStr) ?? 0
        
        if balance <= 0 {
          if let data = defaults?.data(forKey: "blocked_apps_selection"),
             let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
            store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
            store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : ShieldSettings.ActivityCategoryPolicy.specific(selection.categoryTokens)
            store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
          }
          stopDeviceActivityMonitoring()
        } else {
          store.shield.applications = nil
          store.shield.applicationCategories = nil
          store.shield.webDomains = nil
          
          if let data = defaults?.data(forKey: "blocked_apps_selection"),
             let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
            startDeviceActivityMonitoring(seconds: balance, selection: selection)
          }
        }
      } else {
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        store.shield.webDomains = nil
        stopDeviceActivityMonitoring()
      }
    }
    resolve(true)
  }

  @objc
  func hasUsageStatsPermission(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.0, *) {
      let status = AuthorizationCenter.shared.authorizationStatus
      resolve(status == .approved)
    } else {
      resolve(true)
    }
  }

  @objc
  func requestUsageStatsPermission(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.0, *) {
      Task {
        do {
          try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
          resolve(true)
        } catch {
          reject("FAIL", "Authorization request failed: \(error.localizedDescription)", error)
        }
      }
    } else {
      resolve(true)
    }
  }

  @objc
  func hasOverlayPermission(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.0, *) {
      let defaults = UserDefaults(suiteName: "group.com.doparatio.app")
      if let data = defaults?.data(forKey: "blocked_apps_selection"),
         let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
        let hasSelection = !selection.applicationTokens.isEmpty || !selection.categoryTokens.isEmpty || !selection.webDomainTokens.isEmpty
        resolve(hasSelection)
      } else {
        resolve(false)
      }
    } else {
      resolve(true)
    }
  }

  @objc
  func requestOverlayPermission(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.0, *) {
      DispatchQueue.main.async {
        guard let rootVC = UIApplication.shared.keyWindow?.rootViewController else {
          reject("ERROR", "Root view controller not found", nil)
          return
        }
        
        let defaults = UserDefaults(suiteName: "group.com.doparatio.app")
        var currentSelection = FamilyActivitySelection()
        if let data = defaults?.data(forKey: "blocked_apps_selection"),
           let decoded = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
          currentSelection = decoded
        }
        
        var hostingController: UIHostingController<AppPickerView>? = nil
        
        let pickerView = AppPickerView(
          selection: Binding(
            get: { currentSelection },
            set: { currentSelection = $0 }
          ),
          onDone: {
            if let encoded = try? JSONEncoder().encode(currentSelection) {
              defaults?.set(encoded, forKey: "blocked_apps_selection")
              
              let isEnabled = defaults?.bool(forKey: "app_blocker_enabled") ?? false
              let balanceStr = defaults?.string(forKey: "time_balance") ?? "0"
              let balance = Int(balanceStr) ?? 0
              
              if isEnabled {
                let store = ManagedSettingsStore()
                if balance <= 0 {
                  store.shield.applications = currentSelection.applicationTokens.isEmpty ? nil : currentSelection.applicationTokens
                  store.shield.applicationCategories = currentSelection.categoryTokens.isEmpty ? nil : ShieldSettings.ActivityCategoryPolicy.specific(currentSelection.categoryTokens)
                  store.shield.webDomains = currentSelection.webDomainTokens.isEmpty ? nil : currentSelection.webDomainTokens
                  self.stopDeviceActivityMonitoring()
                } else {
                  store.shield.applications = nil
                  store.shield.applicationCategories = nil
                  store.shield.webDomains = nil
                  self.startDeviceActivityMonitoring(seconds: balance, selection: currentSelection)
                }
              }
            }
            hostingController?.dismiss(animated: true) {
              resolve(true)
            }
          },
          onCancel: {
            hostingController?.dismiss(animated: true) {
              resolve(false)
            }
          }
        )
        
        hostingController = UIHostingController(rootView: pickerView)
        if let hc = hostingController {
          hc.modalPresentationStyle = .pageSheet
          rootVC.present(hc, animated: true, completion: nil)
        }
      }
    } else {
      resolve(true)
    }
  }

  private func startDeviceActivityMonitoring(seconds: Int, selection: FamilyActivitySelection) {
    if #available(iOS 16.0, *) {
      let center = DeviceActivityCenter()
      
      let schedule = DeviceActivitySchedule(
        intervalStart: DateComponents(hour: 0, minute: 0),
        intervalEnd: DateComponents(hour: 23, minute: 59),
        repeats: true
      )
      
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
        threshold: DateComponents(minute: 1)
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
        print("Started DeviceActivity monitoring for \(seconds) seconds.")
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

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
