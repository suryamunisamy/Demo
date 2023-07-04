// 
//  BBIDFIDOAuthenticatorDataSource.h
//  Backbase
//
//  Created by Backbase B.V. on 24/04/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorDataSource.h"
#import "BBIDFIDOAuthenticatorType.h"

@class IDFIDOUAFRequestEntry;
@class IDFIDOChallengeParams;

#ifndef BBIDFIDOAUTHENTICATORDATASOURCE_CLASS
#define BBIDFIDOAUTHENTICATORDATASOURCE_CLASS

NS_ASSUME_NONNULL_BEGIN

/// FIDO Authenticator modes
typedef NS_ENUM(NSInteger, IDFIDOAuthenticatorMode) {
    /// The authenticator is on registration mode
    IDFIDOAuthenticatorModeRegistration = 0,
    /// The authenticator is on authentication mode
    IDFIDOAuthenticatorModeAuthentication,
    /// Other modes specific per authenticator
    IDFIDOAuthenticatorModeOther
};

/// Conforming objects will provide data related to the FIDO authenticators
@protocol BBIDFIDOAuthenticatorDataSource <BBIDAuthenticatorDataSource>
/// Provides the FIDO registration request
- (NSString*)appID;

/// Provides the FIDO challenge parameters
- (IDFIDOChallengeParams*)policyChallengeParameters;

/// Provides the Authenticator mode to run
- (IDFIDOAuthenticatorMode)authenticatorMode;

/// Provides the username
- (NSString*)username;

@optional
/// Provides the registration token
- (NSString* _Nullable)registrationToken;

/// Provides the last FIDO response
- (NSDictionary* _Nullable)FIDOResponse;

/// Provides the transaction text, if present
/// @param error optional error object to receive details of a failure to provide the transaction text
- (NSString* _Nullable)transactionText:(NSError* _Nullable* _Nullable)error;

/// Provides which FIDO authenticator (if any) may follow the current authenticator if cancelled
- (BBIDFIDOAuthenticatorType)fallbackAuthenticator;

@end

NS_ASSUME_NONNULL_END

#endif
