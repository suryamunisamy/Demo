// 
//  BBIDChallengeResolver.h
//  Backbase
//
//  Created by Backbase B.V. on 27/02/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Backbase/Backbase.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDIDENTITYCHALLENGERESOLVER_CLASS
#define BBIDIDENTITYCHALLENGERESOLVER_CLASS

/// Error response resolver that can handle WWW-authenticate challenges
@interface BBIDChallengeResolver : NSObject <ErrorResponseResolver>

/**
 * Initializes the error response resolver to handle predefined challenges provided by Identity. For example,
 * device-key, device-signature, otp-choice, otp-verify, uaf-reg etc.
 * @discussion This error response resolver will check the response and data.
 * In case of contain a WWW-Authenticate header with a challenge, this resolver will attempt to locate the appropriated
 * handler for such challenge (see list above), and delegate the handling to that handler.
 * If you need to extend the functionality of this class; either to add extra checks without losing the challenge
 * handling, your implementation should override the <pre>handle</pre> method, check for the condition you need to
 * handle, and if not met delegate to the super implementation (a.k.a. this class).
 * @param authClient OAuth2 Auth client compatible reference
 * @param headers Additional headers that need to be passed whenever the access token needs to be refreshed
 * @param scope Scope to be added to the refresh access token request.
 */
- (instancetype)initWithAuthClient:(NSObject<OAuth2AuthClient>*)authClient
                      extraHeaders:(NSDictionary<NSString*, NSString*>* _Nullable)headers
                             scope:(NSString* _Nullable)scope;
@end

#endif
NS_ASSUME_NONNULL_END
