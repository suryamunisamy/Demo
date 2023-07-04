// 
//  BBIDDeviceAuthenticatorDataSource.h
//  Backbase
//
//  Created by Backbase B.V. on 05/06/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorDataSource.h"

#ifndef BBIDDEVICEAUTHENTICATORDATASOURCE_PROTOCOL
#define BBIDDEVICEAUTHENTICATORDATASOURCE_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

@protocol BBIDDeviceAuthenticatorDataSource <BBIDAuthenticatorDataSource>
- (NSString* _Nullable)challengeToSign;
- (NSString* _Nullable)deviceId;
- (NSString* _Nullable)actionUrl;
@end

NS_ASSUME_NONNULL_END

#endif
