//
//  AnotherViewModel.swift
//  Demo
//
//  Created by Petros Efthymiou on 3/23/21.
//

import RxSwift
import RxCocoa

class AnotherViewModel {
    private var selectedDate: BehaviorRelay<Date?> = BehaviorRelay(value: nil)
    private var selectedTime: BehaviorRelay<Date?> = BehaviorRelay(value: nil)
    var selectionMode: BehaviorRelay<AnotherViewModel.SelectionMode> = BehaviorRelay(value: AnotherViewModel.SelectionMode.date)
    
    var selectedDateString: BehaviorRelay<String> = BehaviorRelay(value: CustomJourney.Another.Strings.selectDate.value)
    var selectedTimeString: BehaviorRelay<String> = BehaviorRelay(value: CustomJourney.Another.Strings.selectTime.value)
    var selectedTimeZoneString: BehaviorRelay<String> = BehaviorRelay(value: CustomJourney.Another.Strings.selectTimeZone.value)
    
    let zoneOptions: [String] = TimeZone.knownTimeZoneIdentifiers.sorted()
    
    private let disposeBag = DisposeBag()

    enum SelectionMode {
        case date, time
    }
    
    private lazy var timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "hh:mm a"
        return formatter
    }()
    
    private lazy var dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MM/dd/YYYY"
        return formatter
    }()
    
    init() {
        selectedDate.bind(onNext: { [weak self] date in
            guard let strongSelf = self,
                  let date = date else { return }
            strongSelf.selectedDateString.accept(strongSelf.dateFormatter.string(from: date))
        }).disposed(by: disposeBag)
        
        selectedTime.bind(onNext: { [weak self] time in
            guard let strongSelf = self,
                  let time = time else { return }
            strongSelf.selectedTimeString.accept(strongSelf.timeFormatter.string(from: time))
        }).disposed(by: disposeBag)
    }
    
    func updateDate(_ date: Date) {
        selectedDate.accept(date)
    }
    
    func updateTime(_ time: Date) {
        selectedTime.accept(time)
    }
}
