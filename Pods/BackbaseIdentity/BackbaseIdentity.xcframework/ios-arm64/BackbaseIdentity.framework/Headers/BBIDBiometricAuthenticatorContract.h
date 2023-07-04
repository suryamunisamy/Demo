// 
//  BBBIDiometricAuthenticatorContract.h
//  Backbase
//
//  Created by Backbase B.V. on 11/04/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorContract.h"
@protocol BBIDDismissableAuthenticator;

#ifndef BBIDBIOMETRICAUTHENTICATORCONTRACT_PROTOCOL
#define BBIDBIOMETRICAUTHENTICATORCONTRACT_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Conforming objects will be notified about user interactions regarding Biometric authentication actions.
@protocol BBIDBiometricAuthenticatorContract <BBIDFIDOAuthenticatorContract, BBIDDismissableAuthenticator>

/// Notifies the conforming object that the user approved the usage of biometric means for authentication.
- (void)userDidGrantBiometricUsage;

/// Notifies the conforming object that the user denied the usage of biometric means for authentication or the device is
/// not configured with biometric information.
- (void)userDidDenyBiometricUsage;

/// Authorize the request by requesting the user for biometric authentication
/// @return YES if the authorization was successful, NO in case of any error.
- (BOOL)authorize;

/// Retries the biometric reading
/// @discussion It will trigger again the biometric reading to confinue with the current operation (registration or
/// authentication)
- (void)retry;

/// Cancels the current operation
- (void)cancel;

@end

NS_ASSUME_NONNULL_END

#endif
