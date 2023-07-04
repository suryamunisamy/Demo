// 
//  BBIDAuthClientDelegate.h
//  Backbase
//
//  Created by Backbase B.V. on 27/03/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDIDENTITYAUTHCLIENTDELEGATE_PROTOCOL
#define BBIDIDENTITYAUTHCLIENTDELEGATE_PROTOCOL

/// BBIDAuthClientDelegate protocol. The conforming object will be notified of events token-related, invalidation,
/// refreshing or failures.
@protocol BBIDAuthClientDelegate <OAuth2AuthClientDelegate>
/**
 * Notifies the conforming object that the refresh token and access token in the app failed to invalidate with an error.
 * @param error Error object containing information about the failure's cause.
 */
- (void)OAuth2AuthClientInvalidateTokensDidFailWithError:(NSError*)error
    NS_SWIFT_NAME(oAuth2AuthClientInvalidateTokensDidFail(with:));
@end

#endif

NS_ASSUME_NONNULL_END
