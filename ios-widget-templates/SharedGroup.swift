import Foundation
import WidgetKit

@objc(SharedGroup)
class SharedGroup: NSObject {
  
  @objc
  func setString(_ key: String, value: String, suiteName: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if let defaults = UserDefaults(suiteName: suiteName) {
      defaults.set(value, forKey: key)
      WidgetCenter.shared.reloadAllTimelines()
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
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}

