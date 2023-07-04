// 
//  BBOAuth2AuthClient.h
//  Backbase
//
//  Created by Backbase B.V. on 29/03/2018.
//  Copyright © 2018 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import <Backbase/OAuth2AuthClient.h>
#import <Backbase/OAuth2ROPCGrant.h>

#ifndef BBOAUTH2AUTHCLIENT_CLASS
#define BBOAUTH2AUTHCLIENT_CLASS

/**
 * OAuth2 AuthClient with support for Resource Owner's Password Credentials grant.
 */
@interface BBOAuth2AuthClient : NSObject <AuthClient, OAuth2AuthClient, OAuth2ROPCGrant>

/**
 * Creates a new OAuth2 AuthClient object with the URL of the token endpoint used to authenticate and refresh access
 * tokens.
 * @param tokenEndpoint URL to the token endpoint.
 * @return A new OAuth2 AuthClient instance.
 */
- (instancetype _Nonnull)initWithTokenEndpoint:(NSURL* _Nonnull)tokenEndpoint;

/**
 * Creates a new OAuth2 AuthClient object with the URL of the token endpoint used to authenticate and refresh access
 * tokens.
 * @param tokenEndpoint URL to the token endpoint.
 * @param clientId Client identifier registered on the authorization server.
 * @param clientSecret Client secret associated with the client identifier registered on the authorization server.
 * @return A new OAuth2 AuthClient instance.
 */
- (instancetype _Nonnull)initWithTokenEndpoint:(NSURL* _Nonnull)tokenEndpoint
                                      clientId:(NSString* _Nullable)clientId
                                  clientSecret:(NSString* _Nullable)clientSecret;

/**
 * Creates a new OAuth2 AuthClient object with the parameters from the backbase.oauth2 configuration block.
 * @param clientSecret Client secret associated with the client identifier registered on the authorization server.
 * @return A new OAuth2 AuthClient instance.
 */
- (instancetype _Nonnull)initWithClientSecret:(NSString* _Nullable)clientSecret;

/**
 * Creates a new OAuth2 AuthClient object with the parameters from the backbase.oauth2 configuration block.
 * clientSecret is null when using this constructor.
 * @return A new OAuth2 AuthClient instance.
 */
- (instancetype _Nonnull)init;

/**
 * Registers the given Invalid Access Token Resolver to the appropriated expected error code.
 * @param resolver The resolver to be used when a Invalid Access token error is received from a request.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if the class was registered successfully.
 */
- (BOOL)registerInvalidAccessTokenResolver:(NSObject<ErrorResponseResolver>* _Nonnull)resolver
                                     error:(NSError* _Nullable* _Nullable)error
    NS_SWIFT_NAME(register(invalidAccessTokenResolver:));

/**
 * Unregisters a resolver object for the Invalid access token error code.
 */
- (void)unregisterInvalidAccessTokenResolver;

/**
 * Registers the given Invalid Refresh Token Resolver to the appropriated expected error code.
 * @param resolver The resolver to be used when a Invalid refresh token error is received from a request.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if the class was registered successfully.
 */
- (BOOL)registerInvalidRefreshTokenResolver:(NSObject<ErrorResponseResolver>* _Nonnull)resolver
                                      error:(NSError* _Nullable* _Nullable)error
    NS_SWIFT_NAME(register(invalidRefreshTokenResolver:));

/**
 * Unregisters a resolver object for the Invalid refresh token error code.
 */
- (void)unregisterInvalidRefreshTokenResolver;
@end

#endif
