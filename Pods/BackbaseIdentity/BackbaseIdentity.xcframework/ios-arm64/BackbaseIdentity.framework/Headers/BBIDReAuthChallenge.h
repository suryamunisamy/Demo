// 
//  BBIDReAuthChallenge.h
//  Backbase
//
//  Created by Backbase B.V. on 06/05/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDREAUTHCHALLENGE_CLASS
#define BBIDREAUTHCHALLENGE_CLASS

@interface BBIDReAuthChallenge : NSObject
@property (strong, nonatomic, nonnull) NSString* challengeType;
@property (strong, nonatomic, nonnull) NSString* acrValues;
@property (strong, nonatomic, nonnull) NSString* scope;
@property (strong, nonatomic, nullable) NSObject* data;
@end

#endif

NS_ASSUME_NONNULL_END
