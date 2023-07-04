// 
//  OAuth2AuthClient.h
//  Backbase
//
//  Created by Backbase B.V. on 29/03/2018.
//  Copyright © 2018 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

/// OAuth2 types of token
typedef NS_ENUM(NSUInteger, OAuth2TokenType) {
    /// There is no token stored
    OAuth2TokenTypeNone = 0,
    /// The stored token is a refresh token
    OAuth2TokenTypeRefreshToken = 1,
    /// The stored token is an access token
    OAuth2TokenTypeAccessToken
};

/**
 * OAuth2 AuthClient allows to interact with servers complaint with the OAuth2 specification. This protocol aims to
 * abstract the commonalities amongst the different grant types. Each grant is modelled on its own separate protocol,
 * allowing the different implementations to choose what grants will support by implementing the desired protocol(s).
 */
@protocol OAuth2AuthClient <AuthClient>

/**
 * Refreshes the access token using the currently stored refresh token. Optionally, a scope could be provided.
 * The result of the operation will be delivered on the delegate.
 * @param delegate Where the new access token will be returned to.
 * @param headers Extra headers to be added to the refresh access token request.
 * @param scope String with the desired scope for the new access token. The authorization server MAY fully or partially
 * ignore the scope requested by the client, based on the authorization server policy or the resource owner's
 * instructions.
 */
- (void)refreshAccessTokenWithDelegate:(NSObject<OAuth2AuthClientDelegate>* _Nonnull)delegate
                               headers:(NSDictionary<NSString*, NSString*>* _Nullable)headers
                                 scope:(NSString* _Nullable)scope;

/**
 * Checks for the presence of a refresh token or access token.
 * @discussion This token should be stored in a secure way by the implementation and be kept in memory only when
 * strictly needed.
 * @return A constant specifying the type of token store if any.
 */
- (OAuth2TokenType)isTokenStored;

/**
 * Invalidates a refresh token and/or access token by removing it from the device's storage.
 * @discussion Besides the removal of the token from the device's storage, the implementation SHOULD notify the
 * authorization server that the refresh token has been revoked in the client. As the OAuth2 specification doesn't
 * mention anything regarding a revoke endpoint this is left as a security suggestion.
 * @param delegate Where the result of the operation will be notified to.
 */
- (void)invalidateTokensWithDelegate:(NSObject<OAuth2AuthClientDelegate>* _Nonnull)delegate;
@end
