//
//  BBIDInputRequiredAuthenticatorView.h
//  Backbase
//
//  Created by Ignacio Calderon on 31/12/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>

#ifndef BBIDINPUTREQUIREDAUTHENTICATORVIEW_PROTOCOL
#define BBIDINPUTREQUIREDAUTHENTICATORVIEW_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Conforming objects will be notified about actions that require user's interaction
@protocol BBIDInputRequiredAuthenticatorView <BBIDAuthenticatorView>
/**
 * A request to prompt the user for the specified fields
 * @param fields the fields to request input from the user for
 */
- (void)promptUserForInput:(NSArray<NSString*>*)fields;

@end

NS_ASSUME_NONNULL_END

#endif
