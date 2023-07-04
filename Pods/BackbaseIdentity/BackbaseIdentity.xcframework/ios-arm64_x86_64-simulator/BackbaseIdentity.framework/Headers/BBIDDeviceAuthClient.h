// 
//  BBIDDeviceAuthClient.h
//  Backbase
//
//  Created by Backbase B.V. on 08/05/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
@protocol PasswordAuthClientDelegate;

NS_ASSUME_NONNULL_BEGIN

#ifndef IDDEVICEAUTHCLIENT_PROTOCOL
#define IDDEVICEAUTHCLIENT_PROTOCOL

/**
 * Device AuthClient allows to interact with servers that can perform passwordless authentications with a registered
 * device.
 */
@protocol BBIDDeviceAuthClient <NSObject>

/**
 * Checks if the device has successfully undergo the registration process.
 * @return YES if the devide has been successfully registered, NO otherwise.
 */
- (BOOL)isDeviceRegistered;

/**
 * Authenticates using information related to the registered device, including but not limited to: biometrics, passcode
 * voice recognition, etc.
 * @param username Username to be used during the authentication
 * @param delegate Delegate to inform about the authentication process.
 */
- (void)authenticateRegisteredDeviceWithUsername:(NSString* _Nonnull)username
                                        delegate:(NSObject<PasswordAuthClientDelegate>* _Nonnull)delegate
                            DEPRECATED_MSG_ATTRIBUTE("This method is deprecated, use "
                                                     "authenticateRegisteredDeviceWithUsername:headers:delegate");

/**
 * Authenticates using information related to the registered device, including but not limited to: biometrics, passcode
 * voice recognition, etc.
 * @param username Username to be used during the authentication
 * @param headers Additional headers that need to be passed to the '/token' endpoint
 * @param delegate Delegate to inform about the authentication process.
 */
- (void)authenticateRegisteredDeviceWithUsername:(NSString* _Nonnull)username
                                         headers:(NSDictionary<NSString*, NSString*>* _Nullable)headers
                                        delegate:(NSObject<PasswordAuthClientDelegate>* _Nonnull)delegate;

/**
 * Resets the Auth client to a <i>first</i> login mode.
 * @discussion After executing the user will be unable to authenticate using the previously approved
 * authenticators and will be force to enroll again.
 */
- (void)reset;

/**
 * Username provider.
 * @discussion This closure is supposed to return the current username
 * which will be utilized by the SDK at various points, such as during the `uaf-auth`,
 * `device-user`, and `fido-initialization` challenge handling.
 */
@property (nonatomic, copy, nullable) NSString* _Nullable (^username)(void);

@end

#endif

NS_ASSUME_NONNULL_END
