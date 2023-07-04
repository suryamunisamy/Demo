//
//  BBIDTermsAndConditionsAuthenticatorDelegate.h
//  Backbase
//
//  Created by Backbase B.V. on 27/11/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDTERMSANDCONDITIONSAUTHENTICATORDELEGATE_PROTOCOL
#define BBIDTERMSANDCONDITIONSAUTHENTICATORDELEGATE_PROTOCOL

/// Conforming object will be notified about changes on the state of the process
@protocol BBIDTermsAndConditionsAuthenticatorDelegate <BBIDAuthenticatorDelegate>

/// Notifies the conforming object that the terms and conditions were accepted by the user
- (void)termsAndConditionsDidSucceed;

/// Notifies the conforming object that the terms and conditions were not successfully accepted by the user.
/// @param error With the cause of the failure or rejection
- (void)termsAndConditionsDidFailWithError:(NSError*)error NS_SWIFT_NAME(termsAndConditionsDidFail(with:));

@end

#endif

NS_ASSUME_NONNULL_END
