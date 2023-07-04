//
//  BBIDInputRequiredAuthenticatorWidget.h
//  Backbase
//
//  Created by Ignacio Calderon on 31/12/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>
#import "BBIDAuthenticator.h"
#import "BBIDInputRequiredAuthenticatorContract.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDINPUTREQUIREDAUTHENTICATOR_CLASS
#define BBIDINPUTREQUIREDAUTHENTICATOR_CLASS

/// Authenticator to handle the `input-required` challenge
@interface BBIDInputRequiredAuthenticator : BBIDAuthenticator <BBIDInputRequiredAuthenticatorContract>

- (void)promptUserForInput;

@end

#endif

NS_ASSUME_NONNULL_END
