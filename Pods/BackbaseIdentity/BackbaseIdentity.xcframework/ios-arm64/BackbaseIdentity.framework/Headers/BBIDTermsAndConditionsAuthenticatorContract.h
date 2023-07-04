//
//  BBIDTermsAndConditionsAuthenticatorContract.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 27/11/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>
#import "BBIDDismissableAuthenticator.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDTERMSANDCONDITIONSAUTHENTICATORCONTRACT_PROTOCOL
#define BBIDTERMSANDCONDITIONSAUTHENTICATORCONTRACT_PROTOCOL

/// Conforming objects will be notified about user interactions regarding the `terms-and-conditions` challenge
@protocol BBIDTermsAndConditionsAuthenticatorContract <BBIDAuthenticatorContract, BBIDDismissableAuthenticator>
/**
 * Signal that the user accepted the T&Cs
 */
- (void)userDidAccept;

/**
 * Signal that the user declined the T&Cs
 */
- (void)userDidDecline;

/**
 * Signal that retrieval of the T&Cs should be retried
 */
- (void)retry;

@end

#endif

NS_ASSUME_NONNULL_END
