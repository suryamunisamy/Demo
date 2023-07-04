import RetailAccountsAndTransactionsJourney
import Resolver

extension Accounts {
    static func buildCustom(navigationController: UINavigationController) -> UIViewController {
        let accountsConfig: AccountsAndTransactions.Configuration? = Resolver.optional()
        
        return {
            let viewController = CustomAccountsViewController()
            viewController.tabBarItem = accountsConfig?.tabItem.barItem
            return viewController
        }()
    }
}
