//
//  BBIDAuthenticatorPresenter.h
//  Backbase
//
//  Created by Backbase B.V. on 12/06/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
@protocol BBIDShowableAuthenticator;
@protocol BBIDDismissableAuthenticator;

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDAUTHENTICATORPRESENTOR_CLASS
#define BBIDAUTHENTICATORPRESENTOR_CLASS

/// Utility class to manage interactions with Authenticators
@interface BBIDAuthenticatorPresenter : NSObject
/**
 * Checks if the notification represents a Authenticator dismiss event.
 * @param notification The Notification received on the navigation listener to be checked
 * @return YES if the notification represents a navigation dismiss event
 */
+ (BOOL)isAuthenticatorDismissEvent:(NSNotification*)notification;

/**
 * Checks if the notification represents a Authenticator show event.
 * @param notification The Notification received on the navigation listener to be checked
 * @return YES if the notification represents a navigation show event
 */
+ (BOOL)isAuthenticatorShowEvent:(NSNotification*)notification;

/**
 * Sends the navigation event to display the authenticator.
 * @param authenticator Authenticator that want to be shown
 */
+ (void)show:(NSObject<BBIDShowableAuthenticator>*)authenticator;

/**
 * Sends the navigation event to dismiss the authenticator.
 * @param authenticator Authenticator that want to be dismissed
 */
+ (void)dismiss:(NSObject<BBIDDismissableAuthenticator>*)authenticator;
@end

#endif

NS_ASSUME_NONNULL_END
