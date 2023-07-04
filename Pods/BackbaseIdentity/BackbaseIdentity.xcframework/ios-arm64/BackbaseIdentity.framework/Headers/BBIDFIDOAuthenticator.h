// 
//  BBIDFIDOAuthenticator.h
//  Backbase
//
//  Created by Backbase B.V. on 23/04/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDFIDOAuthenticatorContract.h"
#import "BBIDFIDOAuthenticatorType.h"

#ifndef BBIDFIDOAUTHENTICATOR_CLASS
#define BBIDFIDOAUTHENTICATOR_CLASS

NS_ASSUME_NONNULL_BEGIN

/// Abstract implementation of a FIDO authenticator
@interface BBIDFIDOAuthenticator : BBIDAuthenticator <BBIDFIDOAuthenticatorContract>

/**
 * Initiates the registration process of the conforming authenticator generating an authenticator sign assertion if
 * everything went as planned, in case of any error the sign assertion will be nil and the error will be reported back
 * on the output parameter.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return A FIDOAuthenticationSignAssertion containing the information about the registration challenge
 */
- (IDFIDOAuthenticatorSignAssertion* _Nullable)initiateRegistration:(NSError* _Nullable* _Nullable)error;

/**
 * Initiates the authentication process of the conforming authentication generating an authentication sign assertion if
 * everything went as planned, in case of any error the sign assertion will be nil and the error will be reported back
 * on the output parameter.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return A FIDOAuthenticationSignAssertion containing the information about the authentication challenge
 */
- (IDFIDOAuthenticatorSignAssertion* _Nullable)initiateAuthentication:(NSError* _Nullable* _Nullable)error;

/**
 * Checks if the current authenticator is registered for the given username.
 * @param username The username to check if this authenticator is registered for.
 * @return YES if the username is registered for this specific authenticator, NO otherwise.
 */
- (BOOL)isRegisteredForUsername:(NSString*)username;

/**
 * Returns the type of the authenticator
 */
- (BBIDFIDOAuthenticatorType)authenticatorType;

@end

NS_ASSUME_NONNULL_END

#endif
