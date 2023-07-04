// 
//  BBIDAuthenticatorDelegate.h
//  Backbase
//
//  Created by Backbase B.V. on 20/02/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

#ifndef BBIDAUTHENTICATORDELEGATE_PROTOCOL
#define BBIDAUTHENTICATORDELEGATE_PROTOCOL

/// Conforming object will be notified about changes on the state of the authentication process
@protocol BBIDAuthenticatorDelegate <NSObject>

/// Notifies the delegate to retry the authentication
- (void)retryAuthentication;

@optional
/// Notifies the delegate to finish the authentication
- (void)authenticatorDidFinish;

@end

#endif
