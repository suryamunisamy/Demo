//
//  CustomWelcomeConfiguration.swift
//  Demo
//
//  Created by Petros Efthymiou on 3/22/21.
//

import UIKit
import RetailJourneyCommon
import BackbaseDesignSystem
import Resolver

class CustomJourney {
    struct Welcome {
        static func build(navigationController: UINavigationController) -> UIViewController {
            let configuration: CustomJourney.Welcome.Configuration? = Resolver.optional()
            let viewController = CustomWelcomeViewController()
            viewController.tabBarItem = configuration?.tabItem.barItem
            return viewController
        }
        
        struct Configuration {
            public var router = CustomJourney.Welcome.Router()
            public var styles = CustomJourney.Styles()
            public var strings = CustomJourney.Welcome.Strings()
            
            public var tabItem: RetailJourneyCommon.TabItem
            
            init(){
                tabItem = TabItem(title: CustomJourney.Welcome.Strings.tabBarTitle,
                                   image: UIImage(named: "icloud.png"))
            }
        }
        
        
        struct Strings {
            static let tabBarTitle  = LocalizedString(deferredValue: "Custom")
            
        }
        
        struct Router {
            public var didSelectOneScreen: (UINavigationController) -> Void = { navigationController in
                navigationController.pushViewController(CustomAccountsViewController(), animated: true)
            }
            
            public var didSelectAnotherScreen: (UINavigationController) -> Void = { navigationController in
                navigationController.pushViewController(AnotherViewController(), animated: true) }
            
            public var didSelectThirdScreen: (UINavigationController) -> Void = {_ in 
                
            }
        }
    }
    
    struct Styles {
        let primaryButton: Style<Button> = { button in
            button.backgroundColor = DesignSystem.shared.colors.primary.default
            button.tintColor = DesignSystem.shared.colors.text.default
            button.layer.cornerRadius = 20
        }
        
        let linkButton: Style<Button> = { button in
            button.tintColor = DesignSystem.shared.colors.primary.default
        }
    }
}
