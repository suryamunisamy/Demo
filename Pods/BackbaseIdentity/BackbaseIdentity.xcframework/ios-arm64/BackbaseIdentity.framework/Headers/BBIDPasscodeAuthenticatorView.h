// 
//  BBIDPasscodeAuthenticatorView.h
//  Backbase
//
//  Created by Backbase B.V. on 08/10/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>

#ifndef BBIDPASSCODEAUTHENTICATORVIEW_PROTOCOL
#define BBIDPASSCODEAUTHENTICATORVIEW_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Conforming objects will be notified about actions that require user's interaction
@protocol BBIDPasscodeAuthenticatorView <BBIDAuthenticatorView>

/// Conforming object will be notified to prompt the user for a passcode change, usually by confirming first and updating
/// after.
- (void)promptForPasscodeChange;

@optional
/// Conforming object will be notified to prompt the user to select a passcode.
/// @param context Object describing the context of the registration.
- (void)promptForPasscodeRegistration:(BBIDRegistrationContext*)context;

/// Conforming object will be notified to prompt the user to select a passcode.
- (void)promptForPasscodeSelection DEPRECATED_MSG_ATTRIBUTE("Please use promptForPasscodeRegistration:");

/// Conforming object will be notified to prompt the user to authenticate using the passcode previously set.
/// @param context Object describing the context of the authentication.
-(void) promptForPasscodeAuthentication:(BBIDAuthenticationContext*)context;

/// Conforming object will be notified to prompt the user to authenticate using the passcode previously set.
-(void) promptForPasscode DEPRECATED_MSG_ATTRIBUTE("Please use promptForPasscodeAuthentication:");

/// Conforming object will be notified to prompt the user to select a passcode in forgot passcode flow
-(void) promptForEnterForgotPasscode;

/// Conforming object will be notified to prompt the user to confirm the passcode entered initially
-(void) promptForConfirmForgotPasscode;

@end

NS_ASSUME_NONNULL_END

#endif
