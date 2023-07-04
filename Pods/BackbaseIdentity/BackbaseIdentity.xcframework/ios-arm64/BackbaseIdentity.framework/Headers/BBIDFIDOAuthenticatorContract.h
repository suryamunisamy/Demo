// 
//  BBIDFIDOAuthenticatorContract.h
//  Backbase
//
//  Created by Backbase B.V. on 23/04/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorContract.h"
#import "BBIDFIDOAuthenticatorDelegate.h"
#import "BBIDFIDOAuthenticatorDataSource.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDFIDOAUTHENTICATORCONTRACT_PROTOCOL
#define BBIDFIDOAUTHENTICATORCONTRACT_PROTOCOL

/// Conforming objects will provide information related to a FIDO authenticator, such as AAID, supported user
/// verification methods, et al.
@protocol BBIDFIDOAuthenticatorContract <BBIDAuthenticatorContract>

/**
 * Returns a description of the supported user verifivation methods.
 */
- (NSDictionary*)supportedUserVerification;

/// Returns the the Authenticator's AAID
- (NSString*)AAID;

/// Returns the Authenticator's version
- (UInt16)version;

/// Returns the Authenticator's signing counter
- (UInt32)signCounter;

/// Returns the Authenticator's registration counter
- (UInt32)registrationCounter;

/// Aborts the current flow entirely, rather than potentially falling back to another FIDO authenticator as `cancel` would
- (void)abortFlow;

@end

#endif

NS_ASSUME_NONNULL_END
