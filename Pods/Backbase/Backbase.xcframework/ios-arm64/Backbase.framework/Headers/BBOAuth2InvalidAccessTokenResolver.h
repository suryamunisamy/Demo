// 
//  BBOAuth2InvalidAccessTokenResolver.h
//  Backbase
//
//  Created by Backbase B.V. on 13/04/2018.
//  Copyright © 2018 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import <Backbase/ErrorResponseResolver.h>

#ifndef BBOAUTH2INVALIDACCESSTOKENRESOLVER_CLASS
#define BBOAUTH2INVALIDACCESSTOKENRESOLVER_CLASS

/**
 * Error response resolver to deal with 401-unauthorized cases when the access token has been expired, revoked or
 * flagged as invalid.
 * This resolver will try to refresh the access token, and replay the original request on behave of the original caller.
 *
 * @discussion In cases where the response does not correspond to an expired/invalid token, the token cannot be
 * refreshed or the second attempt to the request fails with the new access token, the resolver simply will mark the
 * request as failed, and the original response will be issued to the original caller. On the other hand, if the token
 * is refreshed properly AND the second attempt to the request is successful the new data will be passed to the original
 * caller as the result of the original request, thus making the refresh token mechanism more transparent for the users.
 *
 * @note This class is thread safe and handle multiple callbacks simultaneously although that could have negative impact
 * on the performance of the server.
 */
@interface BBOAuth2InvalidAccessTokenResolver : NSObject <ErrorResponseResolver>
- (instancetype _Nonnull)initWithAuthClient:(NSObject<OAuth2AuthClient>* _Nonnull)authClient
                               extraHeaders:(NSDictionary<NSString*, NSString*>* _Nullable)headers
                                      scope:(NSString* _Nullable)scope;
@end

#endif
