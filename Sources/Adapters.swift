import Backbase
import RetailAccountsAndTransactionsJourney
import TransactionsClient2
import ClientCommon
import Foundation
import ArrangementsClient2

extension TransactionClientAPI {
    func getTransactionsCall(with params: RetailAccountsAndTransactionsJourney.Transaction.GetRequestParameters) throws -> Call<[TransactionsClient2.TransactionItem]> {
        return try getTransactionsCall(amountGreaterThan: params.amountGreaterThan,
                                       amountLessThan: params.amountLessThan,
                                       bookingDateGreaterThan: params.bookingDateGreaterThan,
                                       bookingDateLessThan: params.bookingDateLessThan,
                                       types: params.types,
                                       description: params.description,
                                       reference: params.reference,
                                       typeGroups: params.typeGroups,
                                       counterPartyName: params.counterPartyName,
                                       counterPartyAccountNumber: params.counterPartyAccountNumber,
                                       creditDebitIndicator: CreditDebitIndicator(from: params.creditDebitIndicator),
                                       categories: params.categories,
                                       billingStatus: params.billingStatus,
                                       state: TransactionState(from: params.state),
                                       currency: params.currency,
                                       notes: params.notes,
                                       id: params.identifier,
                                       arrangementId: params.arrangementId,
                                       arrangementsIds: params.arrangementsIds,
                                       fromCheckSerialNumber: params.fromCheckSerialNumber,
                                       toCheckSerialNumber: params.toCheckSerialNumber,
                                       checkSerialNumbers: params.checkSerialNumbers,
                                       query: params.query,
                                       from: params.from,
                                       cursor: params.cursor,
                                       size: params.size,
                                       orderBy: params.orderBy,
                                       direction: SortDirection(from: params.direction),
                                       secDirection: SortDirection(from: params.secDirection))
    }
}

extension TransactionsClient2.TransactionItem {
    var transcationItem: RetailAccountsAndTransactionsJourney.Transaction.Item {
        return RetailAccountsAndTransactionsJourney.Transaction.Item(
            identifier: id,
            arrangementId: arrangementId,
            reference: reference,
            description: description,
            typeGroup: typeGroup,
            type: type,
            category: category,
            categoryId: categoryId,
            location: extract(location: location),
            merchant: extract(merchant: merchant),
            bookingDate: bookingDate,
            valueDate: valueDate,
            creditDebitIndicator: extract(creditDebitIndicator: creditDebitIndicator),
            transactionAmountCurrency: .init(amount: transactionAmountCurrency.amount,
                                             currencyCode: transactionAmountCurrency.currencyCode,
                                             additions: transactionAmountCurrency.additions),
            instructedAmountCurrency: extract(currency: instructedAmountCurrency),
            currencyExchangeRate: currencyExchangeRate,
            counterPartyName: counterPartyName,
            counterPartyAccountNumber: counterPartyAccountNumber,
            counterPartyBIC: counterPartyBIC,
            counterPartyCity: counterPartyCity,
            counterPartyAddress: counterPartyAddress,
            counterPartyCountry: counterPartyCountry,
            counterPartyBankName: counterPartyBankName,
            creditorId: creditorId,
            mandateReference: mandateReference,
            billingStatus: billingStatus,
            checkSerialNumber: checkSerialNumber,
            notes: notes,
            runningBalance: runningBalance,
            additions: additions,
            checkImageAvailability: extract(checkImageAvailability: checkImageAvailability),
            creationTime: creationTime,
            originalDescription: originalDescription)
    }
}

private extension TransactionsClient2.TransactionItem {
    func extract(location: TransactionsClient2.TransactionLocation?) -> RetailAccountsAndTransactionsJourney.TransactionLocation? {
        guard let location = location else {
            return nil
        }
        
        return .init(identifier: location.id, latitude: location.latitude,
                     longitude: location.longitude, address: location.address)
    }
    
    func extract(currency: TransactionsClient2.Currency?) -> RetailAccountsAndTransactionsJourney.Transaction.Currency? {
        guard let currency = currency else {
            return nil
        }
        
        return .init(amount: currency.amount, currencyCode: currency.currencyCode, additions: currency.additions)
    }
    
    func extract(merchant: TransactionsClient2.TransactionMerchant?) -> RetailAccountsAndTransactionsJourney.Transaction.Merchant? {
        guard let merchant = merchant else {
            return nil
        }
        let logoURL: URL?
        if let logo = merchant.logo {
            logoURL = URL(string: logo)
        } else {
            logoURL = nil
        }
        
        let websiteURL: URL?
        if let website = merchant.website {
            websiteURL = URL(string: website)
        } else {
            websiteURL = nil
        }
        return .init(identifier: merchant.id, name: merchant.name, iconUrl: logoURL, website: websiteURL)
    }
    
    func extract(creditDebitIndicator: TransactionsClient2.CreditDebitIndicator) -> RetailAccountsAndTransactionsJourney.Transaction.Indicator {
        switch creditDebitIndicator {
        case .crdt:
            return .credit
        case .dbit:
            return .debit
        @unknown default:
            fatalError()
        }
    }
    
    func extract(checkImageAvailability: TransactionsClient2.CheckImageAvailability?) -> RetailAccountsAndTransactionsJourney.Transaction.CheckImageAvailability? {
        guard let checkImageAvailability = checkImageAvailability else { return nil }
        switch checkImageAvailability {
        case .available:
            return .available
        case .unavailable:
            return .unavailable
        @unknown default:
            return nil
        }
    }
}

extension Backbase {
    static func registered<T: DBSClient>(client: T.Type) -> T? {
        return Backbase.registered(client: T.self) as? T
    }
}

private extension CreditDebitIndicator {
    init?(from indicator: RetailAccountsAndTransactionsJourney.Transaction.Indicator?) {
        switch indicator {
        case .some(.credit):
            self = .crdt
        case .some(.debit):
            self = .dbit
        case .none:
            return nil
        }
    }
}

private extension TransactionState {
    init?(from state: RetailAccountsAndTransactionsJourney.Transaction.State?) {
        switch state {
        case .some(.completed):
            self = .completed
        case .some(.uncompleted):
            self = .uncompleted
        case .all, .none:
            return nil
        }
    }
}

private extension TransactionsClient2.SortDirection {
    init?(from direction: RetailAccountsAndTransactionsJourney.Transaction.SortDirection?) {
        switch direction {
        case .some(.asc):
            self = .asc
        case .some(.desc):
            self = .desc
        case .none:
            return nil
        }
    }
}

extension RetailAccountsAndTransactionsJourney.CurrentAccount {
    init(from source: ArrangementsClient2.CurrentAccount) {
        self.init(bookedBalance: source.bookedBalance, availableBalance: source.availableBalance, creditLimit: source.creditLimit,
                  iban: source.IBAN, bban: source.BBAN, currency: source.currency, urgentTransferAllowed: source.urgentTransferAllowed,
                  bic: source.BIC, bankBranchCode: source.bankBranchCode, bankBranchCode2: source.bankBranchCode2, accountInterestRate: source.accountInterestRate,
                  valueDateBalance: source.valueDateBalance, creditLimitUsage: source.creditLimitUsage, creditLimitInterestRate: source.creditLimitInterestRate,
                  creditLimitExpiryDate: source.creditLimitExpiryDate, accruedInterest: source.accruedInterest,
                  debitCardsItems: source.debitCardsItems.map(RetailAccountsAndTransactionsJourney.DebitCardItem.init),
                  accountHolderNames: source.accountHolderNames, startDate: source.startDate, minimumRequiredBalance: source.minimumRequiredBalance,
                  accountHolderAddressLine1: source.accountHolderAddressLine1, accountHolderAddressLine2: source.accountHolderAddressLine2,
                  accountHolderStreetName: source.accountHolderStreetName, town: source.town, postCode: source.postCode, countrySubDivision: source.countrySubDivision,
                  creditAccount: source.creditAccount, debitAccount: source.debitAccount, accountHolderCountry: source.accountHolderCountry, additions: source.additions,
                  identifier: source.id, unmaskableAttributes: source.unmaskableAttributes?.compactMap { MaskableAttribute(rawValue: $0.rawValue) },
                  name: source.name, externalTransferAllowed: source.externalTransferAllowed, crossCurrencyAllowed: source.crossCurrencyAllowed,
                  productKindName: source.productKindName, productTypeName: source.productTypeName, bankAlias: source.bankAlias,
                  sourceId: source.sourceId, visible: source.visible, accountOpeningDate: source.accountOpeningDate, lastUpdateDate: source.lastUpdateDate,
                  userPreferences: source.userPreferences != nil ? RetailAccountsAndTransactionsJourney.UserPreferences(source.userPreferences!) : nil,
                  state: RetailAccountsAndTransactionsJourney.StateItem(source.state), parentId: source.parentId,
                  subArrangements: source.subArrangements?.map(RetailAccountsAndTransactionsJourney.BaseProduct.init) ?? [],
                  financialInstitutionId: source.financialInstitutionId, lastSyncDate: source.lastSyncDate)
    }
}

extension RetailAccountsAndTransactionsJourney.DebitCardItem {
    init(from source: ArrangementsClient2.DebitCardItem) {
        self.init(number: source.number, expiryDate: source.expiryDate, cardId: source.cardId, cardholderName: source.cardholderName,
                  cardType: source.cardType, cardStatus: source.cardStatus, additions: source.additions)
    }
}

extension RetailAccountsAndTransactionsJourney.MaskableAttribute {
    init?(from source: ArrangementsClient2.MaskableAttribute) {
        self.init(rawValue: source.rawValue)
    }
}

extension RetailAccountsAndTransactionsJourney.BaseProduct {
    init(_ account: ArrangementsClient2.BaseProduct) {
        let userPreferences: RetailAccountsAndTransactionsJourney.UserPreferences?
        if let userPreferencesUnwrapped = account.userPreferences {
            userPreferences = RetailAccountsAndTransactionsJourney.UserPreferences(userPreferencesUnwrapped)
        } else {
            userPreferences = nil
        }
        self.init(identifier: account.id,
                  name: account.name,
                  externalTransferAllowed: account.externalTransferAllowed,
                  crossCurrencyAllowed: account.crossCurrencyAllowed,
                  productKindName: account.productKindName,
                  productTypeName: account.productTypeName,
                  bankAlias: account.bankAlias,
                  sourceId: account.sourceId,
                  visible: account.visible,
                  accountOpeningDate: account.accountOpeningDate,
                  lastUpdateDate: account.lastUpdateDate,
                  userPreferences: userPreferences,
                  state: account.state != nil ? StateItem(account.state!) : nil,
                  parentId: account.parentId,
                  subArrangements: account.subArrangements != nil ? account.subArrangements!.map(BaseProduct.init) : nil,
                  financialInstitutionId: account.financialInstitutionId,
                  lastSyncDate: account.lastSyncDate,
                  additions: account.additions)
    }
}

extension RetailAccountsAndTransactionsJourney.UserPreferences {
    init(_ userPreferences: ArrangementsClient2.UserPreferences) {
        self.init(alias: userPreferences.alias,
                  visible: userPreferences.visible,
                  favorite: userPreferences.favorite,
                  additions: userPreferences.additions)
    }
}

extension RetailAccountsAndTransactionsJourney.StateItem {
    init?(_ state: ArrangementsClient2.StateItem?) {
        guard let state = state else { return nil }
        self.init(externalStateId: state.externalStateId, state: state.state, additions: state.additions)
    }
}
