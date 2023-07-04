//
//  AnotherViewController.swift
//  Demo
//
//  Created by Petros Efthymiou on 3/22/21.
//

import UIKit
import BackbaseDesignSystem
import Resolver
import RxSwift

class AnotherViewController: UIViewController {
    @IBOutlet weak var headerLabel: UILabel!
    @IBOutlet weak var dateSelector: Button!
    @IBOutlet weak var timeSelector: Button!
    @IBOutlet weak var zoneSelector: Button!
    @IBOutlet weak var viewDateTimeButton: Button!
    @IBOutlet weak var dateTimePicker: UIDatePicker!
    @IBOutlet weak var dateTimePickerOkButton: Button!
    @IBOutlet weak var timeZoneTableView: UITableView!
    
    @LazyInjected
    private var viewModel: AnotherViewModel

    @OptionalInjected
    private var configuration: CustomJourney.Another.Configuration?
    
    private let disposeBag = DisposeBag()
    
    init() {
        super.init(nibName: "AnotherView", bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setUpConfigurations()
        setUpTableView()
        setUpTapBindings()
        setUpSelectorTextBindings()
    }
    
    private func setUpConfigurations() {
        configuration?.styles.primaryButton(viewDateTimeButton)
        headerLabel.text = CustomJourney.Another.Strings.viewPrompt.value
        viewDateTimeButton.setTitle(CustomJourney.Another.Strings.viewPrompt.value, for: .normal)
    }
    
    private func setUpTableView() {
        timeZoneTableView.delegate = self
        timeZoneTableView.dataSource = self
    }
    
    private func setUpTapBindings() {
        dateSelector.rx.tap.bind(onNext: { [weak self] in
            guard let strongSelf = self else { return }
            strongSelf.dateTimePicker.datePickerMode = .date
            strongSelf.viewModel.selectionMode.accept(.date)
            strongSelf.toggleDateTimePickerVisibility()
        }).disposed(by: disposeBag)
        
        timeSelector.rx.tap.bind(onNext: { [weak self] in
            guard let strongSelf = self else { return }
            strongSelf.dateTimePicker.datePickerMode = .time
            strongSelf.viewModel.selectionMode.accept(.time)
            strongSelf.toggleDateTimePickerVisibility()
        }).disposed(by: disposeBag)
        
        zoneSelector.rx.tap.bind(onNext: { [weak self] in
            guard let strongSelf = self else { return }
            strongSelf.timeZoneTableView.isHidden = false
        }).disposed(by: disposeBag)
        
        viewDateTimeButton.rx.tap.bind(onNext: { [weak self] in
            DispatchQueue.main.async {
                guard let strongSelf = self,
                      let configuration = strongSelf.configuration else { return }
                let date = strongSelf.viewModel.selectedDateString.value
                let time = strongSelf.viewModel.selectedTimeString.value
                let timeZone = strongSelf.viewModel.selectedTimeZoneString.value
                configuration.router.didSelectViewDateTime(strongSelf, date, time, timeZone)
            }
        }).disposed(by: disposeBag)
        
        dateTimePickerOkButton.rx.tap.bind(onNext: { [weak self] in
            guard let strongSelf = self else { return }
            if strongSelf.viewModel.selectionMode.value == .date {
                strongSelf.viewModel.updateDate(strongSelf.dateTimePicker.date)
            } else {
                strongSelf.viewModel.updateTime(strongSelf.dateTimePicker.date)
            }
            strongSelf.toggleDateTimePickerVisibility()
        }).disposed(by: disposeBag)
    }
    
    private func setUpSelectorTextBindings() {
        viewModel.selectedDateString.bind(onNext: { [weak self] date in
            guard let strongSelf = self else { return }
            strongSelf.dateSelector.setTitle(date, for: .normal)
        }).disposed(by: disposeBag)
        
        viewModel.selectedTimeString.bind(onNext: { [weak self] time in
            guard let strongSelf = self else { return }
            strongSelf.timeSelector.setTitle(time, for: .normal)
        }).disposed(by: disposeBag)
        
        viewModel.selectedTimeZoneString.bind(onNext: { [weak self] timeZone in
            guard let strongSelf = self else { return }
            strongSelf.zoneSelector.setTitle(timeZone, for: .normal)
        }).disposed(by: disposeBag)
    }
    
    private func toggleDateTimePickerVisibility() {
        dateTimePicker.isHidden = !dateTimePicker.isHidden
        dateTimePickerOkButton.isHidden = !dateTimePickerOkButton.isHidden
    }
}

extension AnotherViewController: UITableViewDelegate, UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return viewModel.zoneOptions.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell()
        cell.textLabel?.text = viewModel.zoneOptions[indexPath.row]
        cell.isSelected = true
        return cell
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        guard let cell = tableView.cellForRow(at: indexPath),
              let cellText = cell.textLabel?.text else { return }
        viewModel.selectedTimeZoneString.accept(cellText)
        timeZoneTableView.isHidden = true
    }
}
