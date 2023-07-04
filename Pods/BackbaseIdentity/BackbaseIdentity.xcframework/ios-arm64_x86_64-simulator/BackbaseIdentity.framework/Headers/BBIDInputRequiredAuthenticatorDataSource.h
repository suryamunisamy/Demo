// 
//  BBIDInputRequiredAuthenticatorDataSource.h
//  Backbase
//
//  Created by Backbase B.V. on 31/12/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorDataSource.h"

#ifndef BBIDINPUTREQUIREDAUTHENTICATORDATASOURCE_PROTOCOL
#define BBIDINPUTREQUIREDAUTHENTICATORDATASOURCE_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

@protocol BBIDInputRequiredAuthenticatorDataSource <BBIDAuthenticatorDataSource>
- (NSURL*)actionURL;
- (NSArray<NSString*>*)requiredInputs;
@end

NS_ASSUME_NONNULL_END

#endif
