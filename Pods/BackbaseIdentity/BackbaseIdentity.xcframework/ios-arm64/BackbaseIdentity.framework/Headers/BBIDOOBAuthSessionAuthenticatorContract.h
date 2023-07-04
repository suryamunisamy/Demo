//
//  BBIDOOBAuthSessionAuthenticatorContract.h
//  Backbase
//
//  Created by Backbase B.V. on 03/08/2020.
//  Copyright © 2020 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorContract.h"
#import "BBIDDismissableAuthenticator.h"

#ifndef BBIDOOBAUTHSESSIONAUTHENTICATORCONTRACT_PROTOCOL
#define BBIDOOBAUTHSESSIONAUTHENTICATORCONTRACT_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Conforming objects will be notified about user interactions regarding the `input-required` challenge
@protocol BBIDOutOfBandAuthSessionAuthenticatorContract <BBIDAuthenticatorContract, BBIDDismissableAuthenticator>

/// Approve the authentication request
- (void)approve;

/// Decline the authentication request
- (void)decline;

/// Cancel the authentication request
- (void)cancel;

@end

NS_ASSUME_NONNULL_END

#endif
