//
//  PasswordAuthClient.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 06/11/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

/**
 * PasswordAuthClient protocol. The conforming object will allow authenticate using an user identifier and credentials
 * pair.
 */
@protocol PasswordAuthClient <AuthClient>

/**
 * Authenticates the user with the given user id and credentials. The conforming object is responsible for appending
 * the additional provided headers and for filtering out the response headers and keeping the ones are considered
 * tokens.
 * @discussion Depending on the underlying authentication system the user id and credentials might differ
 * from one another, e.g. for some it will be user name and password, for others will be account number and
 * temporal token/pin code.
 * @param userIdentifier User's identifier: email, username, account number, etc.
 * @param credentials Authentication credentials: password, token, temporary password.
 * @param headers A dictionary with headers to be appended to the request.
 * @param bodyParameters A dictionary with parameters to be appended to the request's body.
 * @param tokenNames A list of header names that are considered tokens and should be kept
 * @param delegate Delegate to manage the response of this request
 */
- (void)authenticateWithUserId:(NSString* _Nonnull)userIdentifier
                   credentials:(NSString* _Nonnull)credentials
                       headers:(NSDictionary<NSString*, NSString*>* _Nullable)headers
      additionalBodyParameters:(NSDictionary<NSString*, NSString*>* _Nullable)bodyParameters
                    tokenNames:(NSArray* _Nonnull)tokenNames
                      delegate:(NSObject<PasswordAuthClientDelegate>* _Nullable)delegate;

@end
