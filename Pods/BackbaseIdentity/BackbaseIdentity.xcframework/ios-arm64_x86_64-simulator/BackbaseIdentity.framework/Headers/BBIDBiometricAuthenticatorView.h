//
//  BBBIDiometricAuthenticatorView.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 12/02/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>

#ifndef BBIDBIOMETRICAUTHENTICATORVIEW_PROTOCOL
#define BBIDBIOMETRICAUTHENTICATORVIEW_PROTOCOL

/// Conforming objects will be notified about actions that require user's interaction
@protocol BBIDBiometricAuthenticatorView <BBIDAuthenticatorView>

@optional
/// Conforming object will be notified to prompt the user for permission to use biometrics as a means of authentication.
/// @param context Object describing the context of the registration.
- (void)promptForBiometricRegistration:(BBIDRegistrationContext*)context;

/// Conforming object will be notified to prompt the user for permission to use biometrics as a means of authentication.
- (void)promptForBiometricUsage DEPRECATED_MSG_ATTRIBUTE("Please use promptForBiometricRegistration:");

/// Conforming object will be notified to prompt the user to authenticate using the biometric sensor.
/// @param context Object describing the context of the authentication.
- (void)promptForBiometricAuthentication:(BBIDAuthenticationContext*)context;

/// Conforming object will be notified to prompt the user to authenticate using the biometric sensor.
- (void)promptForBiometricAuthentication DEPRECATED_MSG_ATTRIBUTE("Please use promptForBiometricAuthentication:");

/// Conforming object will be notified when biometrics have been determined to be invalid (e.g. enrolled fingers/faces
/// changed since registration)
- (void)biometricsInvalidated;

@end

#endif
