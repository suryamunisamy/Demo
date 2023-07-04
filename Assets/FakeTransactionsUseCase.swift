//
//  FakeTransactionsUseCase.swift
//  Demo
//
//  Created by Jeriel Ng on 3/9/21.
//

import RetailAccountsAndTransactionsJourney
import TransactionsClient

class FakeTransactionsUseCase: TransactionsUseCase {
    private let completedTransactionCount: Int = 15
    private let pendingTransactionCount: Int = 3
    
    private lazy var client: TransactionsClient? = {
        Backbase.registered(client: TransactionsClient.self) as? TransactionsClient
    }()
    
    func retrieveTransaction(id: String, completion: @escaping RetrieveTransactionHandler) {}
    
    func retrieveTransactions(params: [String : String], completion: @escaping RetrieveTransactionsHandler) {
        client?.retrieveTransactions(withParams: params, completionHandler: { [weak self] transactionItems, error in
            guard error == nil,
                  let transactionItems = transactionItems,
                  let strongSelf = self else { return }
            
            guard let from = Int(params["from"] ?? ""),
                  let size = Int(params["size"] ?? ""),
                  let state = params["state"] else { return }
            let fromOverallIndex = from * size
            let overallCount = state == "COMPLETED" ? strongSelf.completedTransactionCount : strongSelf.pendingTransactionCount
            let lastIndex = overallCount - 1
            
            var actualSize: Int = size
            if fromOverallIndex >= lastIndex {
                completion(.success([]))
            } else if fromOverallIndex + size >= lastIndex {
                actualSize = overallCount - fromOverallIndex
            }
            let fakeList: [TransactionItem] = Array(transactionItems.prefix(actualSize))
            completion(.success(fakeList))
        })
    }
    
    func retrieveIcon(for merchant: Transaction.Merchant, completion: @escaping RetrieveMerchantLogoHandler) {}
}
