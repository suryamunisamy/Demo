//
//  BBIDAuthenticationContext.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 13/10/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BBIDAuthenticationReasons.h"
#import "BBIDFIDOAuthenticator.h"

#ifndef BBIDAUTHENTICATIONCONTEXT
#define BBIDAUTHENTICATIONCONTEXT

NS_ASSUME_NONNULL_BEGIN

/// Context for authentication, describing the reason and additional data.
@interface BBIDAuthenticationContext : NSObject
/// Provided during transaction signing to display a summary of the transaction the user is signing, helping avoid MITM
/// attacks. This text is already localised to the user's locale.
@property (strong, nonatomic, readonly, nullable) NSString* transactionText;
/// The reason for the authentication.
@property BBIDAuthenticationReasons authenticationReason;
/// The FIDO authenticator (if any) that may follow in the flow if the receiving authenticator is cancelled
@property BBIDFIDOAuthenticatorType fallbackAuthenticator;

@end

NS_ASSUME_NONNULL_END

#endif
