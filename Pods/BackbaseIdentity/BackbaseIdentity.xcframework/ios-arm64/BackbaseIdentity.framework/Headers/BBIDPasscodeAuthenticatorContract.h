// 
//  BBIDPasscodeAuthenticatorContract.h
//  Backbase
//
//  Created by Backbase B.V. on 08/10/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>

#ifndef BBIDPASSCODEAUTHENTICATORCONTRACT_PROTOCOL
#define BBIDPASSCODEAUTHENTICATORCONTRACT_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Conforming objects will be notified about user interactions regarding Passcode authentication actions.
@protocol BBIDPasscodeAuthenticatorContract <BBIDFIDOAuthenticatorContract, BBIDDismissableAuthenticator>

/// Informs the authenticator that a passcode has been entered.
/// @discussion Internally the authenticator will take the appropriated actions dependending on the authenticator's
/// mode (registration or authentication).
/// @param passcode Passcode to be processed.
- (void)passcodeDidEnter:(NSString*)passcode;

/// Informs the authenticator that needs to change the old passcode with the new passcode
/// @param oldPasscode Old passcode to be changed.
/// @param newPasscode New passcode to be changed to.
- (void)changePasscode:(NSString*)oldPasscode newPasscode:(NSString*)newPasscode;

/// Cancels the current operation
- (void)cancel;

@optional
/// Informs the authenticator that a passcode has been entered in forgot passcode flow
/// @param passcode Passcode to be processed.
- (void)forgotPasscodeDidEnter:(NSString*)passcode;

/// Informs the authenticator that confirm passcode has been entered in forgot passcode flow
/// @param passcode Passcode to be processed.
- (void)forgotPasscodeDidConfirm:(NSString*)passcode;

@end

NS_ASSUME_NONNULL_END

#endif
