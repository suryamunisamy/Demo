//
//  BBIDInputRequiredAuthenticatorContract.h
//  Backbase
//
//  Created by Ignacio Calderon on 31/12/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorContract.h"
#import "BBIDDismissableAuthenticator.h"

#ifndef BBIDINPUTREQUIREDAUTHENTICATORCONTRACT_PROTOCOL
#define BBIDINPUTREQUIREDAUTHENTICATORCONTRACT_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Conforming objects will be notified about user interactions regarding the `input-required` challenge
@protocol BBIDInputRequiredAuthenticatorContract <BBIDAuthenticatorContract, BBIDDismissableAuthenticator>
/**
 * Submit the requested input
 * @param fields a dictionary of the required input mapped to the requested fields
 */
- (void)submit:(NSDictionary<NSString*, NSString*>*)fields;

/**
 * Cancel the process
 */
- (void)cancel;

@end

NS_ASSUME_NONNULL_END

#endif
