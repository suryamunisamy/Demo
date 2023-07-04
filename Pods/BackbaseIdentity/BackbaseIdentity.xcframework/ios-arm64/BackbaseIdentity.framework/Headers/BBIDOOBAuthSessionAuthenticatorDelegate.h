// 
//  BBIDOOBAuthSessionuthenticatorDelegate.h
//  Backbase
//
//  Created by Backbase B.V. on 03/08/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorDelegate.h"

#ifndef BBIDOOBAUTHSESSIONAUTHENTICATORDELEGATE_PROTOCOL
#define BBIDOOBAUTHSESSIONAUTHENTICATORDELEGATE_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Conforming object will be notified about changes on the state of the process
@protocol BBIDOutOfBandAuthSessionAuthenticatorDelegate <BBIDAuthenticatorDelegate>

/// Notifies the conforming object that the session should be approved
- (void)sessionDecisionApprove;

/// Notifies the conforming object that the session should be declined
- (void)sessionDecisionDecline;

/// Notifies the conforming object that an error occurred
/// @param error the cause of the failure or rejection
- (void)sessionDecisionDidFailWithError:(NSError*)error NS_SWIFT_NAME(sessionDecisionDidFail(with:));

@end

NS_ASSUME_NONNULL_END

#endif
