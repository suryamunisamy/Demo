// 
//  BBIDDeviceKeyChallenge.h
//  Backbase
//
//  Created by Backbase B.V. on 06/06/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDDEVICEKEYCHALLENGE_CLASS
#define BBIDDEVICEKEYCHALLENGE_CLASS

@interface BBIDDeviceKeyChallenge : NSObject
@property (strong, nonatomic, nonnull) NSString* challengeType;
@property (strong, nonatomic, nonnull) NSString* nonce;
@property (strong, nonatomic, nonnull) NSString* deviceId;
@property (strong, nonatomic, nullable) NSString* actionUrl;
@end

#endif

NS_ASSUME_NONNULL_END
