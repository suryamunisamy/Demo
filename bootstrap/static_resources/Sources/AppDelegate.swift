//
// 
//

import UIKit
import RetailUSApp 

@main
class AppDelegate: RetailAppDelegate {
    override init() {
        super.init { (sdk, design) in
            // Use `sdk` as a customization point for Backbase SDK.
            // Use `design` as a customization point for design system.
            return { appConfig in
                // Use `appConfig` as a customization point for the app
            }
        }
    }
}
