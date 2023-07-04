import UIKit
import RetailAccountsAndTransactionsJourney
import Backbase
import TransactionsClient2
import Resolver

class CustomTransactionsViewController: UIViewController {
    @IBOutlet weak var transactionView: UIView!
    @IBOutlet weak var dateLabel: UILabel!
    @IBOutlet weak var transactionNameLabel: UILabel!
    @IBOutlet weak var amountLabel: UILabel!
    
    private lazy var client: TransactionClientAPI? = {
        Backbase.registered(client: TransactionClientAPI.self) as? TransactionClientAPI
    }()

    
    private var account: Account
    private var transactionItem: Transaction.Item?
    
    init(account: Account) {
        self.account = account
        super.init(nibName: "CustomTransactionsView", bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func styleTransactionView() {
        transactionView.layer.cornerRadius = 15
        transactionView.layer.shadowColor = UIColor.black.cgColor
        transactionView.layer.shadowOpacity = 0.3
        transactionView.layer.shadowRadius = 6
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
            guard let accountId: String = account.identifier else { return }
            
            guard let client = self.client,
                  let call = try? client.getTransactionsCall(state: TransactionState.completed, from: 0, size: 1) else {
                return
            }
            
            call.execute { [weak self] result in
                guard let response = try? result.get(),
                      let transactionItems = response.body,
                      let transactionItem = transactionItems.first else {
                    return
                }
                
                self?.transactionItem = transactionItem.transcationItem
                
                let transactionAmount: String = transactionItem.transactionAmountCurrency.amount.stringValue
                let currencyCode: String = transactionItem.transactionAmountCurrency.currencyCode
                let amount: String = "\(transactionAmount) \(currencyCode)"
                
                DispatchQueue.main.async {
                    guard let strongSelf = self else { return }
                    strongSelf.transactionNameLabel.text = transactionItem.counterPartyName
                    strongSelf.amountLabel.text = amount
                    strongSelf.transactionView.addGestureRecognizer(UITapGestureRecognizer(target: strongSelf, action: #selector(strongSelf.didTapTransaction)))
                    strongSelf.styleTransactionView()
                }
            }
    }
    
    @objc
    private func didTapTransaction() {
        guard let item = self.transactionItem,
              let navigationController = self.navigationController else { return }
        let configuration: AccountsAndTransactions.Configuration? = Resolver.optional()
        configuration?.transactions.router.didSelectTransactionItem(navigationController)(item)
    }
}
