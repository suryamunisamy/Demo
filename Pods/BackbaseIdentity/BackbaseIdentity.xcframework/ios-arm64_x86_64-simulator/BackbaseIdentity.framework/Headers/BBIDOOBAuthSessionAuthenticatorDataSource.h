// 
//  BBIDOOBAuthSessionAuthenticatorDataSource.h
//  Backbase
//
//  Created by Backbase B.V. on 03/08/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorDataSource.h"
#import "BBIDOOBAuthSessionDetails.h"

#ifndef BBIDOOBAUTHSESSIONAUTHENTICATORDATASOURCE_PROTOCOL
#define BBIDOOBAUTHSESSIONAUTHENTICATORDATASOURCE_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Conforming objects will provide data related to the `oob-authn-session` challenge
@protocol BBIDOutOfBandAuthSessionAuthenticatorDataSource <BBIDAuthenticatorDataSource>

/// The URL to direct the user's decision to
- (NSURL*)actionURL;

/// The details of the web session
- (BBIDOutOfBandAuthSessionDetails*)sessionDetails;

@end

NS_ASSUME_NONNULL_END

#endif
