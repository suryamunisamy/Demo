//
//  PasswordAuthClientDelegate.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 07/11/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

/// PasswordAuthClientDelegate protocol. The conforming object will be notified when a authentication request with
/// credentials has succeeded or failed.
@protocol PasswordAuthClientDelegate <NSObject>

/**
 * Notifies the conforming object that the authentication request has succeeded and some headers have been received
 * in the process.
 * @param headers A dictionary key-value with the names of the received headers and their values.
 */
- (void)authenticationDidSucceedWithHeaders:(NSDictionary<NSString*, NSString*>* _Nonnull)headers
    NS_SWIFT_NAME(authenticationDidSucceed(with:));

/**
 * Notifies the conforming object that the authentication request has failed. The error is passed to the object for
 * further processing.
 * @param error Error object containing information about the failure's cause.
 */
- (void)authenticationDidFailWithError:(NSError* _Nonnull)error NS_SWIFT_NAME(authenticationDidFail(with:));

@optional

/**
 * Notifies the conforming object that the authentication request has been stopped and requires an action to be taken.
 * @discussion This method will be invoked if implemented whenever the authentication response returns a success status
 * 2xx excluding 200. Meaning that the developer needs to require the user to take an action, for instance, authenticate
 * using biometrics, or authenticate after the registration has completed.
 *
 * @param response Response received that requires the action to be taken.
 */
- (void)authenticationDidRequireAction:(NSHTTPURLResponse* _Nonnull)response
    NS_SWIFT_NAME(authenticationDidRequire(action:));
@end
