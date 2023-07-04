// 
//  BBIDDeviceAuthenticatorDelegate.h
//  Backbase
//
//  Created by Backbase B.V. on 05/06/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorDelegate.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDDEVICEAUTHENTICATORDELEGATE_PROTOCOL
#define BBIDDEVICEAUTHENTICATORDELEGATE_PROTOCOL

@protocol BBIDDeviceAuthenticatorDelegate <BBIDAuthenticatorDelegate>
- (void)deviceKeyDidRegisterSuccessfully:(NSString*)publicKey algorithm:(NSString*)algorithmCode
    NS_SWIFT_NAME(deviceKeyDidRegister(publicKey:algorithm:));

- (void)deviceKeyDidSignChallenge:(NSString*)signedChallenge
                         deviceId:(NSString*)deviceId
                        algorithm:(NSString*)algoritmCode
                        challenge:(NSString*)challenge
    NS_SWIFT_NAME(deviceKeyDidSign(challenge:deviceId:algorithm:challenge:));

- (void)deviceKeyDidFailWithError:(NSError*)error NS_SWIFT_NAME(deviceKeyDidFail(with:));
@end

#endif

NS_ASSUME_NONNULL_END
