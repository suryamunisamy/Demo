// 
//  BBIDAuthClient.h
//  Backbase
//
//  Created by Backbase B.V. on 04/02/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import <Backbase/BBOAuth2AuthClient.h>
#import "BBIDDeviceAuthClient.h"
#import "BBIDAuthenticatorsProvider.h"
@protocol BBIDAuthClientDelegate;
@protocol BBIDFIDORegistrationDelegate;
@class BBIDAuthenticator;
@protocol ErrorResponseResolver;

#ifndef BBIDIDENTITYAUTHCLIENT_CLASS
#define BBIDIDENTITYAUTHCLIENT_CLASS

/**
 * Auth client to be used to authenticate with Backbase identity.
 * This client allows registration of a response resolver for
 * authentication challenges.
 */
@interface BBIDAuthClient : BBOAuth2AuthClient <BBIDDeviceAuthClient, BBIDAuthenticatorsProvider, BBAuthenticatorAggregator>

/**
 * Creates a new Identity AuthClient object with the information set on the configuration file under the
 * section <i>backbase.identity</i>. Optionally, you can provide a clientSecret if your Identity configuration requires
 * so.
 * @param clientSecret Client secret associated with the client identifier registered on the authorization server.
 * @return A new Identity AuthClient instance.
 */
- (instancetype _Nonnull)initWithClientSecret:(NSString* _Nullable)clientSecret;

/**
 * Registers the given challenge resolver.
 * @param resolver The resolver to be used when a challenge is received.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if the class was registered successfully.
 */
- (BOOL)registerChallengeResponseResolver:(NSObject<ErrorResponseResolver>* _Nonnull)resolver
                                    error:(NSError* _Nullable* _Nullable)error
    NS_SWIFT_NAME(register(challengeResponseResolver:));

/**
 * Unregisters a challenge resolver object.
 */
- (void)unregisterChallengeResponseResolver;

/**
 * Adds an authenticator to the list of available authenticators.
 * @param authenticator Authenticator to be added.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if the authenticator was successfully added.
 */
- (BOOL)addAuthenticator:(BBIDAuthenticator* _Nonnull)authenticator error:(NSError* _Nullable* _Nullable)error;

/**
 * Removes an authenticator from the list of available authenticators.
 * @discussion In case of multiple matches only the first one will be removed.
 * @param authenticatorType The type of authenticator to remove
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if the authenticator was successfully removed.
 */
- (BOOL)removeAuthenticatorByType:(Class _Nonnull)authenticatorType error:(NSError* _Nullable* _Nullable)error;

/**
 * Retrieves a registered authenticator's renderable..
 * @param identifier The authenticator ID.
 * @return the renderable, or nil if not found.
 */
- (NSObject<Renderable>* _Nullable)authenticatorRenderable:(NSString* _Nonnull)identifier;

/**
 * Starts the UAF registration process explicitly. This method requires that the user is already authenticated before
 * usage.
 * @discussion This method comes in handy in cases where the user initially dismisses the registration explicitly, but
 * wants to enable them in a later stage. This process will skip any already registered authenticator and only will
 * register authenticators that have been added to this client and match the policy received from the server.
 * @param username Username that will be associated to authenticators.
 * @param delegate Where the result of the operation will be notified to.
 */
- (void)startUAFRegistrationWithUsername:(NSString* _Nonnull)username
                                delegate:(NSObject<BBIDFIDORegistrationDelegate>* _Nonnull)delegate;

/**
 * Invalidates a refresh token and/or access token by removing it from the device's storage.
 * @discussion Besides the removal of the token from the device's storage, the implementation SHOULD notify the
 * authorization server that the refresh token has been revoked in the client. As the OAuth2 specification doesn't
 * mention anything regarding a revoke endpoint this is left as a security suggestion.
 * @param delegate Where the result of the operation will be notified to.
 */
- (void)invalidateTokensWithDelegate:(NSObject<BBIDAuthClientDelegate>* _Nonnull)delegate;
@end

#endif
