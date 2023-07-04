//
//  BBIDOOBAuthSessiondAuthenticatorWidget.h
//  Backbase
//
//  Created by Backbase B.V. on 03/08/2020.
//  Copyright © 2020 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>
#import "BBIDAuthenticator.h"
#import "BBIDOOBAuthSessionAuthenticatorContract.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDOOBAUTHSESSIONAUTHENTICATOR_CLASS
#define BBIDOOBAUTHSESSIONAUTHENTICATOR_CLASS

/// Authenticator to handle the `oob-authn-session` challenge
@interface BBIDOutOfBandAuthSessionAuthenticator : BBIDAuthenticator <BBIDOutOfBandAuthSessionAuthenticatorContract>

@end

#endif

NS_ASSUME_NONNULL_END
