// 
//  BBIDFIDOAuthenticatorDelegate.h
//  Backbase
//
//  Created by Backbase B.V. on 23/04/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
@protocol BBIDAuthenticatorDelegate;
@class IDFIDOAuthenticatorSignAssertion;
@class BBIDFIDOAuthenticator;

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDFIDOAUTHENTICATORDELEGATE_PROTOCOL
#define BBIDFIDOAUTHENTICATORDELEGATE_PROTOCOL

/// Conforming object will be notified about changes on the state of the authentication process
@protocol BBIDFIDOAuthenticatorDelegate <BBIDAuthenticatorDelegate>

/**
 * Notifies the conforming object that an authenticator has successfully completed an authentication assertion.
 * @param authenticator Authenticator instance that has completed the operation
 * @param signAssertion The assertion signed that was returned by the authenticator
 */
- (void)authenticator:(BBIDFIDOAuthenticator*)authenticator
    didCompleteWithAssertion:(IDFIDOAuthenticatorSignAssertion* _Nullable)signAssertion
    NS_SWIFT_NAME(authenticator(_:didCompleteWithAssertion:));

/**
 * Notifies the conforming object that an authenticator failed to complete the operation.
 * @param authenticator Authenticator instance that has completed the operation
 * @param error Error object with the reason of the failure
 */
- (void)authenticator:(BBIDFIDOAuthenticator*)authenticator
     didFailWithError:(NSError*)error NS_SWIFT_NAME(authenticator(_:didFailWithError:));
@end

#endif

NS_ASSUME_NONNULL_END
