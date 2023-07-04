// 
//  BBIDOTPAuthenticatorDelegate.h
//  Backbase
//
//  Created by Backbase B.V. on 23/04/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorDelegate.h"
#import "BBIDOTPChoice.h"

#ifndef BBIDOTPAUTHENTICATORDELEGATE_CLASS
#define BBIDOTPAUTHENTICATORDELEGATE_CLASS

NS_ASSUME_NONNULL_BEGIN

/// Conforming objects will be notified about events of the OTP flow
@protocol BBIDOTPAuthenticatorDelegate <BBIDAuthenticatorDelegate>

/**
 * Notifies the conforming object that an out-of-band method has been choosen
 * @param choice Name of the method used to deliver the OTP
 */
- (void)OTPDidSelectChoice:(BBIDOTPChoice*)choice NS_SWIFT_NAME(otpDidSelect(choice:));

/**
 * Notifies the conforming object that an OTP value has been entered.
 * @param OTPValue The value received on the out-of-band channel
 */
- (void)OTPDidEnterValue:(NSString*)OTPValue NS_SWIFT_NAME(otpDidEnter(value:));

/**
 * Notifies the conforming object that the operation has failed with an especific error.
 * @param error Error with the reason of the failure
 */
- (void)OTPDidFailWithError:(NSError*)error NS_SWIFT_NAME(otpDidFail(with:));
@end

NS_ASSUME_NONNULL_END

#endif
