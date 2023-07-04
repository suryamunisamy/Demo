// 
//  BBIDOOBAuthSessionChallenge.h
//  Backbase
//
//  Created by Backbase B.V. on 03/08/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDOOBAuthSessionDetails.h"

#ifndef BBIDOOBAUTHSESSIONCHALLENGE_CLASS
#define BBIDOOBAUTHSESSIONCHALLENGE_CLASS

NS_ASSUME_NONNULL_BEGIN

@interface BBIDOutOfBandAuthSessionChallenge : NSObject
@property (strong, nonatomic, readonly) NSString* actionURL;
@property (strong, nonatomic, readonly) NSDictionary* data;
@property (strong, nonatomic, readonly) BBIDOutOfBandAuthSessionDetails* details;
@end

NS_ASSUME_NONNULL_END

#endif
