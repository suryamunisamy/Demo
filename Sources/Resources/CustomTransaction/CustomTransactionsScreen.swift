import RetailAccountsAndTransactionsJourney
import Resolver

extension Transactions {
    static func buildCustom(navigationController: UINavigationController, account: Account) -> UIViewController {
        return {
            return CustomTransactionsViewController(account: account)
        }()
    }
}
