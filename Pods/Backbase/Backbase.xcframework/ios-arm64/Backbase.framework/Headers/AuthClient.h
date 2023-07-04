//
//  AuthClient.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 06/11/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

/**
 * AuthClient protocol. The conforming object will allow multiple operations related to session management.
 * @discussion This protocol is intended to serve as a base for future extensions, as such, it covers the common ground
 * between most authentication/authorization mechanisms: a way to check if there is a session active, how to end a
 * session and retrieve information relative to the session itself (under the umbrella of <i>tokens</i>).
 */
@protocol AuthClient <NSObject>

/**
 * The conforming object will end the current session. As this action might involve a network request, the completion
 * handler should be invoked once the session has been ended.
 * @discussion The completion handler could be nil. It is up to the implementation to validate its nullity before
 * invoking it.
 * @param delegate A delegate to be notified of the state after the session is ended.
 * @param error An associated error passed if there is one.
 */
- (void)endSessionWithDelegate:(NSObject<AuthClientDelegate>* _Nullable)delegate error:(NSError* _Nullable)error;

/**
 * The conforming object will check the presence and validity of what this auth client considers a session.
 * @discussion Different types of authentication will consider sessions in different ways. For instance, a cookie-based
 * authentication will consider a session valid as long as the cookie is not expired. On token-based authentications,
 * a session is considered valid as long as the access token is not expired. These are 2 simple and common examples,
 * your implementation should consider what defines a session and make the checks upon those factors.
 * @param delegate A delegate to be notified of the state.
 */
-(void) checkSessionValidity:(NSObject<AuthClientDelegate>* _Nullable) delegate;

/**
 * The conforming object will return the tokens that are relevant for this authentication type.
 * @discussion Depending on the kind of authentication and specific implementations of the backend services, multiple
 * tokens could be issued and required for operation. For this reason, multiple tokens can be retrieved. Each
 * implementation will be responsible for defining any conventions as to what names of the tokens should be in the
 * dictionary. As a general recommendation, the keys should match the names of the headers/cookies where the tokens
 * come from.
 * @return A key-value dictionary with all tokens retrieved by this authentication type.
 */
- (NSDictionary<NSString*, NSString*>* _Nonnull)tokens;

/**
 * The conforming object will start an active process to check for the validity of the session.
 * @discussion The implementation of this method should vary between implementations, one implementation might use
 * cookie checks based on time intervals, others might use idle timers that get reset when activity is detected.
 * @param delegate A delegate to be notified about the state change
 * @param error Error indicating the reason of the failure
 * @return YES if the session observer started successfully, NO otherwise.
 */
- (BOOL)startSessionObserver:(NSObject<AuthClientDelegate>* _Nonnull)delegate
                       error:(NSError* _Nullable* _Nullable)error;

/**
 * The conforming object will stop the active check process. No further changes on the session validity will be reported
 */
-(void) endSessionObserver;

@optional

/**
 * The conforming object will end the current session. As this action might involve a network request, the completion
 * handler should be invoked once the session has been ended.
 * @discussion The completion handler could be nil. It is up to the implementation to validate its nullity before
 * invoking it.
 * @param delegate A delegate to be notified of the state after the session is ended.
 */
- (void)endSessionWithDelegate:(NSObject<AuthClientDelegate>* _Nullable)delegate DEPRECATED_MSG_ATTRIBUTE("Please use endSessionWithDelegate:error:");

/**
 * The conforming object will update the access and refresh tokens, expiry time and token type for requests.
 *
 * @discussion Expected payload should be a data presenration of an `NSDictionary` which looks like the following:
 * ```objc
 * NSDictionary* payload = @{
    @"refresh_token": @"xxxxxxxxxxxx",
    @"access_token": @"yyyyyyyyyyyy",
    @"expires_in": @3600,
    @"token_type": @"Bearer"
 };
 * ```
 *
 *@param payload NSData representation of the token information.
 *@param error A pointer to an NSError.
 *
 *@return True if the updating of token information succeeded.
 */
- (BOOL)processAuthorizationPayload:(NSData * _Nonnull)data error:(NSError* _Nullable* _Nullable)error;

@end
