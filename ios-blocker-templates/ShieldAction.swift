import ManagedSettings
import Foundation
import UIKit

@available(iOS 15.0, *)
class ShieldActionProvider: ShieldActionDelegate {
    override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            // Attempt to open the DopaRatio application
            if let url = URL(string: "doparatio://") {
                openURL(url)
            }
            completionHandler(.close)
        case .secondaryButtonPressed:
            // Dismiss shield (iOS will close the shield and let user return to launcher/previous app)
            completionHandler(.close)
        default:
            completionHandler(.close)
        }
    }

    override func handle(action: ShieldAction, for category: ActivityCategoryToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        completionHandler(.close)
    }

    override func handle(action: ShieldAction, for webDomain: WebDomainToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        completionHandler(.close)
    }
    
    private func openURL(_ url: URL) {
        guard let applicationClass = NSClassFromString("UIApplication") as? NSObject.Type else { return }
        let sharedSelector = NSSelectorFromString("sharedApplication")
        guard applicationClass.responds(to: sharedSelector) else { return }
        guard let sharedApplication = applicationClass.perform(sharedSelector)?.takeUnretainedValue() else { return }
        let openSelector = NSSelectorFromString("openURL:")
        guard sharedApplication.responds(to: openSelector) else { return }
        _ = sharedApplication.perform(openSelector, with: url)
    }
}
