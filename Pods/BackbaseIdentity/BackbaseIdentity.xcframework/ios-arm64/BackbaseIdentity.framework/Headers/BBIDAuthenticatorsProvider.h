// 
//  BBIDAuthenticatorsProvider.h
//  Backbase
//
//  Created by Backbase B.V. on 07/11/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
@class BBIDFIDOAuthenticator;
@class BBIDOTPAuthenticator;
@class BBIDDeviceAuthenticator;

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDIDENTITYAUTHENTICATORSPROVIDER_PROTOCOL
#define BBIDIDENTITYAUTHENTICATORSPROVIDER_PROTOCOL

/// Conforming objects provide access to specific authenticators
@protocol BBIDAuthenticatorsProvider <NSObject>

/**
 * @return a list of FIDO compatible authenticators.
 */
- (NSArray<BBIDFIDOAuthenticator*>*)FIDOAuthenticators;

/**
 * Returns the FIDO authenticator that matches the given AAID.
 * @param aaid Desired AAID to find
 * @return the authenticator if matched, nil otherwise.
 */
- (BBIDFIDOAuthenticator* _Nullable)findFIDOAuthenticatorByAAID:(NSString*)aaid;

/**
 * @return the otp authenticator, or null if it is not supported.
 */
- (BBIDOTPAuthenticator* _Nullable)OTPAuthenticator;

/**
 * @return the {@link BBIDDeviceAuthenticator}, or null if it is not registered.
 */
- (BBIDDeviceAuthenticator* _Nullable)deviceAuthenticator;

@end

#endif

NS_ASSUME_NONNULL_END
