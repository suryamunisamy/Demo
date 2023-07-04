//
//  SessionDelegate.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 07/06/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

/// Possible states of a session
typedef NS_ENUM(NSUInteger, SessionState) {
    /// There is no sessions at the moment
    SessionStateNone = 0,
    /// There is at least one valid session at the moment
    SessionStateValid,
};

/// Session state delegate. The conforming object will be notified of the session state changes during the application
/// life-cycle
@protocol SessionDelegate <NSObject>

/**
 * Notifies the conforming object that the session has changed, there are (so far) 2 possible transitions: logged in ->
 * logged out and viceversa.
 * The notification will carry the state on which the session is currently in.
 * @param newSessionState An enumerated value representing the current state of the session.
 */
- (void)sessionStateDidChange:(SessionState)newSessionState;

@end
