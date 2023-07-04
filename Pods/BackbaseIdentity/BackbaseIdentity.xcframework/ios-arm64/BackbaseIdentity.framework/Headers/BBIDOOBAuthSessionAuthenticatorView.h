//
//  BBIDOOBAuthSessionAuthenticatorView.h
//  Backbase
//
//  Created by Backbase B.V. on 03/08/2020.
//  Copyright © 2020 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BBIDOOBAuthSessionDetails.h"

#ifndef BBIDOOBAUTHSESSIONAUTHENTICATORVIEW_PROTOCOL
#define BBIDOOBAUTHSESSIONAUTHENTICATORVIEW_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Conforming objects will be notified about actions that require user's interaction
@protocol BBIDOutOfBandAuthSessionAuthenticatorView <BBIDAuthenticatorView>
/**
 * A request to prompt the user to approve or decline the web session
 * @param details the details of the web session being authenticated
 */
- (void)promptUserForDecision:(BBIDOutOfBandAuthSessionDetails*)details;

@end

NS_ASSUME_NONNULL_END

#endif
