// 
//  BBIDReAuthAuthenticatorDataSource.h
//  Backbase
//
//  Created by Backbase B.V. on 06/05/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorDataSource.h"

NS_ASSUME_NONNULL_BEGIN

/// Conforming objects will provide data related to the `reauth` challenge
@protocol BBIDReAuthAuthenticatorDataSource <BBIDAuthenticatorDataSource>
/// Provides the acrValues of the `reauth` challenge
- (NSString*)acrValues;
/// Provides the scope of the `reauth` challenge
- (NSString*)scope;
/// Provides any additional data of the `reauth` challenge
- (NSObject*)data;
@end

NS_ASSUME_NONNULL_END
