//
//  BBIDUpdatePasswordAuthenticatorDelegate.h
//  Backbase
//
//  Created by Backbase B.V. on 11/03/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDUPDATEPASSWORDAUTHENTICATORDELEGATE_PROTOCOL
#define BBIDUPDATEPASSWORDAUTHENTICATORDELEGATE_PROTOCOL

/// Conforming object will be notified about changes on the state of the process
@protocol BBIDUpdatePasswordAuthenticatorDelegate <BBIDAuthenticatorDelegate>

/// Notifies the conforming object that the new password has been selected
/// @param updatedPassword the new password
- (void)onNewPasswordConfirmed:(NSString*)updatedPassword;

/// Notifies the conforming object that the password has been successfully updated
/// @param response the success response
/// @param data the data of the success response
- (void)updatePasswordDidSucceedWithResponse:(NSHTTPURLResponse*)response data:(NSData*)data;

/// Notifies the conforming object that the password was not successfully updated.
/// @param error the cause of the failure or rejection
- (void)updatePasswordDidFailWithError:(NSError*)error NS_SWIFT_NAME(updatePasswordDidFail(with:));

@end

#endif

NS_ASSUME_NONNULL_END
