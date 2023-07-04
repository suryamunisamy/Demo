import RetailAccountsAndTransactionsJourney
import Backbase
import TransactionsClient2
import ClientCommon

class FakeTransactionsUseCase: TransactionsUseCase {
    private let completedTransactionCount: Int = 5
    private let pendingTransactionCount: Int = 5

    private lazy var client: TransactionClientAPI? = {
        Backbase.registered(client: TransactionClientAPI.self)
    }()

    func retrieveTransactions(with params: RetailAccountsAndTransactionsJourney.Transaction.GetRequestParameters, completion: @escaping RetrieveTransactionsCompletionHandler) {
        guard let call = try? client?.getTransactionsCall(with: params) else {
                return
            }
            
            call.execute { [weak self] result in
                guard let response = try? result.get(),
                      let items = response.body,
                      let self = self else { return }
                
                guard let from = params.from,
                      let size = params.size,
                      let state = params.state else { return }
                let fromOverallIndex = from * size
                let overallCount = state == .completed ? self.completedTransactionCount : self.pendingTransactionCount
                let lastIndex = overallCount - 1
                
                var actualSize: Int = size
                if fromOverallIndex >= lastIndex {
                    completion(.success([]))
                } else if fromOverallIndex + size >= lastIndex {
                    actualSize = overallCount - fromOverallIndex
                }
                let fakeList: [TransactionItem] = Array(items.prefix(actualSize))
                completion(.success(fakeList.map(\.transcationItem)))
            }
    }

    func retrieveIcon(for merchant: RetailAccountsAndTransactionsJourney.Transaction.Merchant, completion: @escaping RetrieveMerchantLogoHandler) { }

    func retrieveCheckImages(transactionIdentifier: String, completion: @escaping RetrieveCheckImagesHandler) { }

    func retrieveTransaction(identifier: String, completion: @escaping RetrieveTransactionCompletionHandler) { }
    
    
}
