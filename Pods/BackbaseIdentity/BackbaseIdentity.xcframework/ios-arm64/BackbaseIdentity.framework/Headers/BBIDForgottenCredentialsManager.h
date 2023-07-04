// 
//  BBIDForgottenCredentialsManager.h
//  Backbase
//
//  Created by Backbase B.V. on 31/12/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

#import <Backbase/Backbase.h>
#import "BBIDForgottenCredentialsDelegate.h"
#import "BBIDForgotPasscodeDelegate.h"

#ifndef BBIDFORGOTTENCREDENTIALSMANAGER_CLASS
#define BBIDFORGOTTENCREDENTIALSMANAGER_CLASS

NS_ASSUME_NONNULL_BEGIN

/// Convenience class for all operations related to forgotten credentials, like username, password.
@interface BBIDForgottenCredentialsManager : NSObject

/// Convenience method to start the process to retrieve the forgotten username. The result of the operation will be
/// delivered in the delegate's methods.
/// @param delegate Delegate instance to return the result of the operation.
+ (void)retrieveForgottenUsername:(NSObject<BBIDForgottenCredentialsDelegate>*)delegate;

/// Convenience method to start the process to reset the forgotten password. The result of the operation will be
/// delivered in the delegate's methods.
/// @param delegate Delegate instance to return the result of the operation.
+ (void)retrieveForgottenPassword:(NSObject<BBIDForgottenCredentialsDelegate>*)delegate;

/// Convenience method to start the process to reset the forgotten passcode. The result of the operation will be
/// delivered in the delegate's methods.
/// @param username The username of the user that needs to reset passcode.
/// @param password The password of user that needs to reset passcode.
/// @param delegate Delegate instance to return the result of the operation.
+ (void)forgotPasscodeForUsername:(NSString*)username
                         password:(NSString*)password
                         delegate:(NSObject<BBIDForgotPasscodeDelegate>*)delegate NS_SWIFT_NAME(forgotPasscode(username:password:delegate:));

@end

NS_ASSUME_NONNULL_END

#endif
