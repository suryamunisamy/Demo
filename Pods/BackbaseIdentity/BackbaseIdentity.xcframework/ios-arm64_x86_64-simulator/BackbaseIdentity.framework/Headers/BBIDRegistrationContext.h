//
//  BBIDRegistrationContext.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 23/04/2021.
//  Copyright © 2021 Backbase. All rights reserved.
//

#import <Foundation/Foundation.h>

#ifndef BBIDREGISTRATIONCONTEXT
#define BBIDREGISTRATIONCONTEXT

NS_ASSUME_NONNULL_BEGIN

/// Context for registration.
@interface BBIDRegistrationContext : NSObject
/// The FIDO authenticator (if any) that may follow in the flow if the receiving authenticator is cancelled
@property BBIDFIDOAuthenticatorType fallbackAuthenticator;

@end

NS_ASSUME_NONNULL_END

#endif
