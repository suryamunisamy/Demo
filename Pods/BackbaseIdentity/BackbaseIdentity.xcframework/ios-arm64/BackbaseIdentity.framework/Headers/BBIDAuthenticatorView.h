// 
//  BBIDAuthenticatorView.h
//  Backbase
//
//  Created by Backbase B.V. on 23/07/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Protocol to define the general expected behavior of any Authenticator's view
@protocol BBIDAuthenticatorView <NativeView>

/**
 * Notifies the conforming object that an authentication attempt has completed successfully.
 * @discussion The conforming object can take any actions required to update the view accordingly, such as, show a
 * message, play a success animation or simply finish the authenticator.
 */
- (void)authenticatorDidSucceed;

/**
 * Notifies the conforming object that an authentication attempt has failed.
 * @discussion The conforming object can take any actions required to update the view accordingly, such as, show a
 * message, play a failure animation or simply finish the authenticator.
 * @param error Error that cause the failure of the authentication attempt.
 */
- (void)authenticatorDidFailWithError:(NSError*)error NS_SWIFT_NAME(authenticatorDidFail(with:));

@end

NS_ASSUME_NONNULL_END
