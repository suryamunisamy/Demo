//
//  DefaultBBIDTermsAndConditionsAuthenticatorView.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 27/11/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <Backbase/Backbase.h>
#import "BBIDTermsAndConditionsAuthenticatorContract.h"
#import "BBIDTermsAndConditionsAuthenticatorView.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef DEFAULTBBIDTERMSANDCONDITIONSAUTHENTICATORVIEW_CLASS
#define DEFAULTBBIDTERMSANDCONDITIONSAUTHENTICATORVIEW_CLASS

@interface DefaultBBIDTermsAndConditionsAuthenticatorView : UIView <BBIDTermsAndConditionsAuthenticatorView>
@property (strong, nonatomic) NSObject<BBIDTermsAndConditionsAuthenticatorContract>* contract;

@end

#endif

NS_ASSUME_NONNULL_END
