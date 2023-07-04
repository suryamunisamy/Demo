//
// 
//

import UIKit
import RetailUSApp
import Backbase
import BackbaseDesignSystem
import RetailAccountsAndTransactionsJourney
import Resolver
import TransactionsClient2
import RetailCardsManagementJourney
import RetailMoreJourney
import RetailAppCommon
import ArrangementsClient2

@main
class AppDelegate: RetailUSAppDelegate {
override init() {
    super.init { (sdk, design) in
        // Use `sdk` as a customization point for Backbase SDK.
        // Use `design` as a customization point for design system.
        //var cardImage =  CardsManagement.Design.
        //DesignSystem.initialize(jsonName: "designTokens", bundle: .main)
        //DesignSystem.initialize(jsonName: "designTokens")
        Resolver.register { FakeTransactionsUseCase() as TransactionsUseCase }
        Resolver.register { CustomJourney.Welcome.Configuration() }
        Resolver.register { CustomJourney.Another.Configuration() }
        Resolver.register { AnotherViewModel() }
        return { appConfig in
            // Use `appConfig` as a customization point for the app
           //sdbxaz-sara zovfspZnFF5RLx1mL69evw
            //appConfig.authentication.design.styles.background ={ view in
            //   view.
            //}
            
            DesignSystem.initialize(jsonName: "designTokens")
            //DesignSystem.initialize(jsonName: "designTokens", bundle: .main)
            appConfig.splash.backgroundImage = UIImage(named: "splash.png")
            appConfig.splash.strings.title = ""
            appConfig.splash.strings.subtitle = ""
            appConfig.authentication.login.image =  UIImage(named: "ctslogo.png")
            appConfig.authentication.passcode.loginImage = UIImage(named: "ctslogo.png")
            let currentPaymentCardContentProvider = appConfig.cardsManagement.uiDataMapper.paymentCardContentProvider
            appConfig.cardsManagement.uiDataMapper.paymentCardContentProvider = { CardItem, cvvPlaceholder in
                let current = currentPaymentCardContentProvider(CardItem, cvvPlaceholder)
                let front = PaymentCardContent.Front(backgroundType: current.front.backgroundType,
                                                     labelOne: current.front.labelOne,
                                                     labelTwo: current.front.labelTwo,
                                                     labelThree: current.front.labelThree,
                                                     labelFour: current.front.labelFour,
                                                     leftTopImage: DesignSystem.SizedImage(image: UIImage(named: "ctslogo.png"), size: CGSize(width: 40, height: 40)),
                                                     rightTopImage: current.front.rightTopImage,
                                                     rightMiddleImage: DesignSystem.SizedImage(image: UIImage(named: "Wifi.png"), size: CGSize(width: 40, height: 40)),
                                                     rightBottomImage: current.front.rightBottomImage,
                                                     statusViewContent: current.front.statusViewContent
                                                     
                )
                return PaymentCardContent(identifier: CardItem.identifier, front: front, back: current.back, style: DesignSystem.shared.styles.paymentCard)
            }
        
            
            appConfig.router.didUpdateState = { state in
                return { window in
                    DispatchQueue.main.async {
                        // check preconditions
                        let entryPoint: RetailAppCommon.EntryPoint
                        let featureFilter = Resolver.resolve(FeatureFilter.self)

                        // grab an entry point
                        if let features = featureFilter.features {
                            entryPoint = .tabbedMenu([
                                Accounts.build(navigationController:),
                                CardsDetails.build(navigationController:),
                                More.build(identifier: PaymentHub.identifier),
                                More.build(navigationController:)
                            ])
                        } else {
                            entryPoint = state.entryPoint
                        }
                        
                        // update the window
                        let stateScreenBuilder = RetailUSAppRouter.screenBuilder(for: entryPoint)
                        let stateViewController = RetailUSAppRouter.viewController(for: stateScreenBuilder)
                        window.rootViewController = stateViewController
                    }
                }
            }
            
            appConfig.accountsAndTransactions.accounts.router.didSelectProduct = { navigationController in
                return { product in
                    guard let vc = Transactions.buildCustom(navigationController: navigationController, account: product.account) as? CustomTransactionsViewController else {
                        return
                    }
                    
                    navigationController.pushViewController(vc, animated: true)
                    
                }
            }
            appConfig.router.didUpdateState = { state in
                    return { window in
                        DispatchQueue.main.async {
                            let entryPoint: RetailAppCommon.EntryPoint
                            let featureFilter = Resolver.resolve(FeatureFilter.self)
                            if let features = featureFilter.features {
                                entryPoint = .tabbedMenu([
                                    Accounts.buildCustom(navigationController:),
                                    CustomJourney.Welcome.build(navigationController:),
                                    CardsDetails.build(navigationController:),
                                    More.build(identifier: PaymentHub.identifier),
                                    More.build(navigationController:)
                                ])
                            } else {
                                entryPoint = state.entryPoint
                            }
                            
                            let stateScreenBuilder = RetailUSAppRouter.screenBuilder(for: entryPoint)
                            let stateViewController = RetailUSAppRouter.viewController(for: stateScreenBuilder)
                            window.rootViewController = stateViewController
                        }
                    }
                }
        }
    }
    
    if let serverURL: URL = URL(string: Backbase.configuration().backbase.serverURL) {
        let transactionsClientBaseURL = serverURL
            .appendingPathComponent("api")
            .appendingPathComponent("transaction-manager")
        
        let productSummaryClientBaseURL = serverURL
            .appendingPathComponent("api")
            .appendingPathComponent("arrangement-manager")
        
        let transactionsClient = TransactionClientAPI()
        transactionsClient.baseURL = transactionsClientBaseURL
        try? Backbase.register(client: transactionsClient)
        
        let productSummaryClient = ProductSummaryAPI()
        productSummaryClient.baseURL = productSummaryClientBaseURL
        try! Backbase.register(client: productSummaryClient)
    }
    
    if let serverURL: URL = URL(string: Backbase.configuration().backbase.serverURL) {
                let transactionsClientBaseURL = serverURL
                    .appendingPathComponent("api")
                    .appendingPathComponent("transaction-manager")
                
                let transactionsClient = TransactionClientAPI()
                transactionsClient.baseURL = transactionsClientBaseURL
                try? Backbase.register(client: transactionsClient)
            }
    if let serverURL: URL = URL(string: Backbase.configuration().backbase.serverURL) {
            let productSummaryClientBaseURL = serverURL
                .appendingPathComponent("api")
                .appendingPathComponent("arrangement-manager")
            
            let productSummaryClient = ProductSummaryAPI()
            productSummaryClient.baseURL = productSummaryClientBaseURL
            try! Backbase.register(client: productSummaryClient)
        }
    
}
}
