//
//  BBIDBiometricAuthenticator.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 12/02/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>
#import "BBIDBiometricAuthenticatorContract.h"

#ifndef BBIDBIOMETRICAUTHENTICATOR_CLASS
#define BBIDBIOMETRICAUTHENTICATOR_CLASS

/// Core implementation of an FIDO biometric authenticator
@interface BBIDBiometricAuthenticator : BBIDFIDOAuthenticator <BBIDBiometricAuthenticatorContract>
@end

#endif
