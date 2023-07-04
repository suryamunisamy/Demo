//
//  CustomWelcomeViewController.swift
//  Demo
//
//  Created by Jeriel Ng on 3/22/21.
//

import UIKit
import Resolver
import BackbaseDesignSystem
import RetailAccountsAndTransactionsJourney

class CustomWelcomeViewController: UIViewController {
    @OptionalInjected
    private var configuration: CustomJourney.Welcome.Configuration?
    
    @IBOutlet weak var thirdScreenButton: UIButton!
    
    @IBOutlet weak var oneScreenButton: Button!
    @IBOutlet weak var anotherScreenButton: Button!
    
    init() {
        super.init(nibName: "CustomWelcomeView", bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        stylizeButtons()
    }
    
    private func stylizeButtons() {
        configuration?.styles.primaryButton(oneScreenButton)
        configuration?.styles.linkButton(anotherScreenButton)
    }
    
    @IBAction
    private func didTapOneScreenButton() {
        guard let navigationController = self.navigationController,
              let configuration = self.configuration else { return }
        configuration.router.didSelectOneScreen(navigationController)
    }
    
    @IBAction
    private func didTapAnotherScreenButton() {
        guard let navigationController = self.navigationController,
              let configuration = self.configuration else { return }
        configuration.router.didSelectAnotherScreen(navigationController)
    }
    
    
    @IBAction func didTapThirdScreenButton(_ sender: UIButton) {
    }
}
