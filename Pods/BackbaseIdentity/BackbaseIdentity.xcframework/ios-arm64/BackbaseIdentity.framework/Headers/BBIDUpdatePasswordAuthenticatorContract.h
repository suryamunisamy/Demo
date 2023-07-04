//
//  BBIDUpdatePasswordAuthenticatorContract.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 11/03/2020.
//  Copyright © 2020 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>
#import "BBIDDismissableAuthenticator.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDUPDATEPASSWORDAUTHENTICATORCONTRACT_PROTOCOL
#define BBIDUPDATEPASSWORDAUTHENTICATORCONTRACT_PROTOCOL

/// Conforming objects will be notified about user interactions regarding the `update-password` challenge
@protocol BBIDUpdatePasswordAuthenticatorContract <BBIDAuthenticatorContract, BBIDDismissableAuthenticator>
/**
 * Submit the new password
 * @param newPassword the new password chosen by the user
 */
- (void)submit:(NSString*)newPassword;

/**
 * Cancel the process
 */
- (void)cancel;

@end

#endif

NS_ASSUME_NONNULL_END
