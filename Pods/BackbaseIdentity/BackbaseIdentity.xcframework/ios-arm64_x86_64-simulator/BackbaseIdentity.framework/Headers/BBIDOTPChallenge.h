// 
//  BBIdentityChallenge.h
//  Backbase
//
//  Created by Backbase B.V. on 21/05/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDOTPChoice.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDOTPCHALLENGE_CLASS
#define BBIDOTPCHALLENGE_CLASS

@interface BBIDOTPChallenge : NSObject
@property (strong, nonatomic, nonnull) NSString* challengeType;
@property (strong, nonatomic, nullable) NSString* otpMethod;
@property (strong, nonatomic, nullable) NSString* otpType;
@property (strong, nonatomic, nullable, readonly) NSArray<BBIDOTPChoice*>* otpChoices;
@end

#endif

NS_ASSUME_NONNULL_END
