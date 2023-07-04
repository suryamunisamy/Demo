//
//  BBIDOOBAuthenticationManager.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 31/07/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BBIDOOBAuthenticationDelegate.h"

#ifndef BBIDOOBAUTHENTICATIONMANAGER_CLASS
#define BBIDOOBAUTHENTICATIONMANAGER_CLASS

NS_ASSUME_NONNULL_BEGIN

/// Convenience class for all operations related to out-of-band authentication
@interface BBIDOutOfBandAuthManager : NSObject

/// Convenience method to start the process of out-of-band authentication. The result of the operation will be
/// delivered in the delegate's methods.
/// @param username the username of the user to be authenticated.
/// @param confirmationId the id of the confirmation to be be approved.
/// @param acrValues acrValues for the authentication process.
/// @param secret secret value for the authentication process.
/// @param delegate delegate instance to return the result of the operation.
+ (void)startAuthenticationFlowWithUsername:(NSString*)username
                             confirmationId:(NSString*)confirmationId
                                  acrValues:(NSString*)acrValues
                                     secret:(NSString*)secret
                                   delegate:(NSObject<BBIDOutOfBandAuthDelegate>*)delegate
    NS_SWIFT_NAME(startAuthenticationFlow(username:confirmationId:acrValues:secret:delegate:));

@end

NS_ASSUME_NONNULL_END

#endif
