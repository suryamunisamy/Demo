//
//  BBIDTermsAndConditionsAuthenticatorDataSource.h
//  Backbase
//
//  Created by Backbase B.V. on 27/11/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDTERMSANDCONDITIONSAUTHENTICATORDATASOURCE_PROTOCOL
#define BBIDTERMSANDCONDITIONSAUTHENTICATORDATASOURCE_PROTOCOL

/// Conforming objects will provide data related to the `terms-and-conditions` challenge
@protocol BBIDTermsAndConditionsAuthenticatorDataSource <BBIDAuthenticatorDataSource>

/// Returns the resource URL to retrieve the terms and conditions text.
- (NSURL*)resourceURL;

/// Returns the HTTP method to be used to retrieve the terms and conditions text.
- (NSString*)HTTPMethod;

/// Returns the action token associated to the required action
- (NSString*)actionToken;
@end

#endif

NS_ASSUME_NONNULL_END
