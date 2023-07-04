// 
//  BBIDDeviceAuthenticator.h
//  Backbase
//
//  Created by Backbase B.V. on 04/06/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticator.h"
#import "BBIDDeviceAuthenticatorContract.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDDEVICEAUTHENTICATOR_CLASS
#define BBIDDEVICEAUTHENTICATOR_CLASS

/// Authenticator to handle device registration/authentication
@interface BBIDDeviceAuthenticator : BBIDAuthenticator <BBIDDeviceAuthenticatorContract>

/**
 * Signs a given challenge with the private key and returns the based64 encoded result in DER format.
 * @param challenge String to be signed
 * @param error Error to be reported in case of failure.
 * @return A base64 encoded string containing the signature of the challenge.
 */
- (NSString* _Nullable)signChallenge:(NSString*)challenge error:(NSError**)error;

/**
 * @return the  device id, nil if device id is not present.
 */
+ (NSString* _Nullable)deviceId;

@end

#endif

NS_ASSUME_NONNULL_END
