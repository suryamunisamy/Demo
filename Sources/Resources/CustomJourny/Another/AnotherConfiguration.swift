//
//  AnotherConfiguration.swift
//  Demo
//
//  Created by Petros Efthymiou on 3/23/21.
//

import UIKit
import RetailJourneyCommon

extension CustomJourney {
    struct Another {
        struct Configuration {
            public var strings = CustomJourney.Another.Strings()
            public var router = CustomJourney.Another.Router()
            public var styles = CustomJourney.Styles()
        }
        
        struct Strings {
            static let viewPrompt = LocalizedString(deferredValue: "View the selected date-time")
            static let alertHeader = LocalizedString(deferredValue: "Date and time selected")
            static let selectDate = LocalizedString(deferredValue: "Select a date")
            static let selectTime = LocalizedString(deferredValue: "Select a time")
            static let selectTimeZone = LocalizedString(deferredValue: "Select a time zone")
        }
        
        struct Router {
            public var didSelectViewDateTime: (UIViewController, String, String, String) -> Void = {
                viewController, date, time, zone in
                let alert =  UIAlertController(title: CustomJourney.Another.Strings.alertHeader.value,
                                               message: "\(date) at \(time) \(zone)",
                                               preferredStyle: .alert)
                alert.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))
                viewController.present(alert, animated: true, completion: nil)
            }
        }
    }
}
