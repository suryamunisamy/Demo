//
//  BBIDUpdatePasswordAuthenticatorDataSource.h
//  Backbase
//
//  Created by Backbase B.V. on 11/03/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDUPDATEPASSWORDAUTHENTICATORDATASOURCE_PROTOCOL
#define BBIDUPDATEPASSWORDAUTHENTICATORDATASOURCE_PROTOCOL

/// Conforming objects will provide data related to the `update-password` challenge
@protocol BBIDUpdatePasswordAuthenticatorDataSource <BBIDAuthenticatorDataSource>

/// Returns the resource URL to submit the new password.
- (NSURL*)resourceURL;

/// Returns the HTTP method to be used to submit the new password.
- (NSString*)HTTPMethod;

/// Returns the action token associated to the required action
- (NSString*)actionToken;
@end

#endif

NS_ASSUME_NONNULL_END
