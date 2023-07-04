//
//  BBIDAuthenticator.h
//  Backbase
//
//  Created by Backbase B.V. on 05/02/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorContract.h"

#ifndef BBIDAUTHENTICATOR_CLASS
#define BBIDAUTHENTICATOR_CLASS

NS_ASSUME_NONNULL_BEGIN

/// Abstract implementation of Authenticator.
@interface BBIDAuthenticator : NativeRenderer <BBIDAuthenticatorContract>
/// Creates an authenticator with linking to the default view according to the name conventions.
- (instancetype _Nonnull)init;

/**
 * Initializes an authenticator with a view class that conforms the NativeView protocol, that will be used by this
 * Renderer.
 * @param viewClass view class reference to be used by this Authenticator(renderer) when displayed.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return An authenticator object or nil in case of errors.
 */
- (instancetype _Nullable)initWithViewClass:(Class _Nonnull)viewClass
                                      error:(NSError* _Nullable* _Nullable)error;

/**
 * Finalizes the authenticator execution and dismiss its view.
 */
- (void)finish NS_REQUIRES_SUPER;

@end

NS_ASSUME_NONNULL_END

#endif
