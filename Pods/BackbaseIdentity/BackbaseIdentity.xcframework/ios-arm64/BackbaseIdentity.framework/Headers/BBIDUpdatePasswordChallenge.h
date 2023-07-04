// 
//  BBIDUpdatePasswordChallenge.h
//  Backbase
//
//  Created by Backbase B.V. on 11/03/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDUPDATEPASSWORDCHALLENGE_CLASS
#define BBIDUPDATEPASSWORDCHALLENGE_CLASS

@interface BBIDUpdatePasswordChallenge : NSObject
@property (strong, nonatomic, nonnull) NSString* URI;
@property (strong, nonatomic, nonnull) NSString* HTTPMethod;
@end

#endif

NS_ASSUME_NONNULL_END
