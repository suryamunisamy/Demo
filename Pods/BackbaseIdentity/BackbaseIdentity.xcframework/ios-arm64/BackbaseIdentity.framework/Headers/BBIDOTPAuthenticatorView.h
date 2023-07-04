//
//  BBIDOTPAuthenticatorView.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 23/04/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>
#import "BBIDOTPAuthenticationContext.h"

#ifndef BBIDOTPAUTHENTICATORVIEW_PROTOCOL
#define BBIDOTPAUTHENTICATORVIEW_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Conforming objects will be notified about actions that require user's interaction
@protocol BBIDOTPAuthenticatorView <BBIDAuthenticatorView>

/**
 * Notifies the conforming object that the view should prompt a way to select a method amongst the given ones.
 * @param availableMethods The list of method's names that are allowed to be send an OOB OTP.
 */
@optional
- (void)promptForOTPMethod:(NSArray<BBIDOTPChoice*>*)availableMethods
    DEPRECATED_MSG_ATTRIBUTE("Please use promptForOTPMethod:context");

/**
 * Notifies the conforming object that the view should prompt a way to input the OTP received in the OOB channel.
 * @param chosenMethod The chosen method for receiving the OTP
 */
@optional
- (void)promptForOTPValueWithMethod:(BBIDOTPChoice*)chosenMethod
    DEPRECATED_MSG_ATTRIBUTE("Please use promptForOTPValueWithMethod:context");

/**
 * Notifies the conforming object that the view should prompt a way to select a method amongst the given ones.
 * @param availableMethods The list of method's names that are allowed to be send an OOB OTP.
 * @param context Object describing the context of the otp authentication.
 */
@optional
- (void)promptForOTPMethod:(NSArray<BBIDOTPChoice*>*)availableMethods context:(BBIDOTPAuthenticationContext*)context;

/**
 * Notifies the conforming object that the view should prompt a way to input the OTP received in the OOB channel.
 * @param chosenMethod The chosen method for receiving the OTP
 * @param context Object describing the context of the otp authentication.
 */
@optional
- (void)promptForOTPValueWithMethod:(BBIDOTPChoice*)chosenMethod context:(BBIDOTPAuthenticationContext*)context;

/**
 * Notifies the conforming object that the view should prompt a way to input the OTP received in the OOB channel.
 */
@optional
- (void)promptForOTPValue DEPRECATED_MSG_ATTRIBUTE("Please use promptForOTPValueWithMethod:");

@end

NS_ASSUME_NONNULL_END

#endif
