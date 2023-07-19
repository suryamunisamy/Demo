//
//  DemoUITestsLaunchTests.swift
//  DemoUITests
//
//  Created by ec2-user on 7/17/23.
//

import XCTest

final class DemoUITestsLaunchTests: XCTestCase {

    override class var runsForEachTargetApplicationUIConfiguration: Bool {
        true
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLaunch() throws {
        let app = XCUIApplication()
        app.launch()

        // Insert steps here to perform after app launch but before taking a screenshot,
        // such as logging into a test account or navigating somewhere in the app

        
        /*
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "Launch Screen"
        attachment.lifetime = .keepAlways
        add(attachment)
         */
    }
    
    func testLogin(){
        let app = XCUIApplication()
        app.launch()
        let loginButton = app.buttons["Login"]
        //print(" Surya \(app.textFields)")
        let username = app.textFields.element(boundBy: 0)
        let password = app.secureTextFields.element(boundBy: 0)
        loginButton.tap()
        username.tap()
        username.typeText("sdbxaz-sara")
        password.tap()
        password.typeText("zovfspZnFF5RLx1mL69evw")
        //let backButton = app.navigationBars.buttons["Back"]
        //XCTAssertTrue(testButton.waitForExistence(timeout: TimeInterval(timeout)))
        loginButton.tap()
        //backButton.tap()
    }
}
