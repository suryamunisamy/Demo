import UIKit
import RetailAccountsAndTransactionsJourney
import Resolver
import ArrangementsClient2
import Backbase

class CustomAccountsViewController: UITableViewController {
    private lazy var client: ProductSummaryAPI = {
        Backbase.registered(client: ProductSummaryAPI.self) as! ProductSummaryAPI
    }()

    
    private var productList: [ArrangementsClient2.CurrentAccount] = [] {
        didSet {
            DispatchQueue.main.async {
                self.tableView.reloadData()
            }
        }
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        loadAccounts()
    }
    
    func loadAccounts() {
        do {
            let call = try client.getProductSummaryCall()
            
            call.execute { [weak self] result in
                guard let response = try? result.get() else {
                    return
                }
                
                self?.productList = response.body?.currentAccounts?.products ?? []
            }
        } catch {
            print(error)
        }
    }

}

extension CustomAccountsViewController {
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell()
        let product = productList[indexPath.row]
        cell.textLabel?.text = product.name ?? "no name"
        return cell
    }
    
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return productList.count
    }
    
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        guard let navigationController = self.navigationController else { return }
        let configuration: AccountsAndTransactions.Configuration? = Resolver.optional()
        let product = productList[indexPath.row]
        configuration?.accounts.router.didSelectProduct(navigationController)(.current(RetailAccountsAndTransactionsJourney.CurrentAccount(from: product)))
    }
}
