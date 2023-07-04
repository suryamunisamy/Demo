// 
//  OAuth2AuthClientDelegate.h
//  Backbase
//
//  Created by Backbase B.V. on 29/03/2018.
//  Copyright © 2018 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

#ifndef OAUTH2AUTHCLIENTDELEGATE_PROTOCOL
#define OAUTH2AUTHCLIENTDELEGATE_PROTOCOL

/// OAuth2AuthClientDelegate protocol. The conforming object will be notified of events token-related, invalidation,
/// refreshing or failures.
@protocol OAuth2AuthClientDelegate <NSObject>

/**
 * Notifies the conforming object that the refresh token and access token in the app have been invalidated.
 */
- (void)OAuth2AuthClientTokensDidInvalidate;

/**
 * Notifies the conforming object that the refresh access token request was successful and the new access token is been
 * kept.
 * @param headers A dictionary key-value with the names of the received headers and their values.
 */
- (void)OAuth2AuthClientAccessTokenDidRefresh:(NSDictionary<NSString*, NSString*>* _Nonnull)headers
    NS_SWIFT_NAME(oAuth2AuthClientAccessTokenDidRefresh(with:));

/**
 * Notifies the conforming object that the refresh access token request failed with an specific error.
 * @param error Error object containing information about the failure's cause.
 */
- (void)OAuth2AuthClientAccessTokenDidFailToRefresh:(NSError* _Nonnull)error
    NS_SWIFT_NAME(oAuth2AuthClientAccessTokenDidFailToRefresh(with:));
@end

#endif
