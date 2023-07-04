// 
//  BBIDInputRequiredChallenge.h
//  Backbase
//
//  Created by Backbase B.V. on 31/12/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

#ifndef BBIDINPUTREQUIREDCHALLENGE_CLASS
#define BBIDINPUTREQUIREDCHALLENGE_CLASS

NS_ASSUME_NONNULL_BEGIN

@interface BBIDInputRequiredChallenge : NSObject
@property (strong, nonatomic, readonly) NSString* actionURL;
@property (strong, nonatomic, readonly) NSArray<NSString*>* requiredInput;
@end

NS_ASSUME_NONNULL_END

#endif
