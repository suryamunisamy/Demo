//
//  AuthClientDelegate.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 07/11/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

/**
 * AuthClientDelegate protocol. The conforming object will be use to receive notifications of the state change of the
 * session.
 */
@protocol AuthClientDelegate <NSObject>

/**
 * Notifies the conforming object that the session has changed, there are (so far) 2 possible transitions: logged in ->
 * logged out and viceversa.
 * The notification will carry the state on which the session is currently in.
 * @param newSessionState An enumerated value representing the current state of the session.
 * @param error An error object to capture session related errors.
 */
- (void)sessionState:(SessionState)newSessionState withError:(NSError*)error;

/**
 * Notifies the conforming object that the session has changed, there are (so far) 2 possible transitions: logged in ->
 * logged out and viceversa.
 * The notification will carry the state on which the session is currently in.
 * @param newSessionState An enumerated value representing the current state of the session.
 */
@optional
- (void)sessionState:(SessionState)newSessionState DEPRECATED_MSG_ATTRIBUTE("Please use sessionState:withError:");
@end
