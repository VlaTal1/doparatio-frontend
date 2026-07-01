import ManagedSettings
import ManagedSettingsUI
import UIKit

@available(iOS 15.0, *)
class ShieldConfigurationProvider: ShieldConfigurationDataSource {
    private func commonConfiguration() -> ShieldConfiguration {
        // Nordic Organic colors
        let backgroundColor = UIColor(red: 19/255, green: 26/255, blue: 23/255, alpha: 1.0) // #131A17
        let primaryColor = UIColor(red: 234/255, green: 240/255, blue: 237/255, alpha: 1.0) // #EAF0ED
        let secondaryColor = UIColor(red: 122/255, green: 138/255, blue: 130/255, alpha: 1.0) // #7A8A82
        let accentColor = UIColor(red: 229/255, green: 169/255, blue: 60/255, alpha: 1.0) // #E5A93C

        return ShieldConfiguration(
            backgroundBlurStyle: .dark,
            backgroundColor: backgroundColor,
            icon: nil,
            title: ShieldConfiguration.Label(text: "DopaRatio Блокировка", color: primaryColor),
            subtitle: ShieldConfiguration.Label(
                text: "Время на балансе закончилось. Выполните задачи в приложении DopaRatio, чтобы заработать новые минуты!",
                color: secondaryColor
            ),
            primaryButtonLabel: ShieldConfiguration.Label(text: "Открыть DopaRatio", color: accentColor),
            primaryButtonBackgroundColor: nil,
            secondaryButtonLabel: ShieldConfiguration.Label(text: "Назад", color: primaryColor)
        )
    }

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        return commonConfiguration()
    }

    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        return commonConfiguration()
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        return commonConfiguration()
    }

    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
        return commonConfiguration()
    }
}
