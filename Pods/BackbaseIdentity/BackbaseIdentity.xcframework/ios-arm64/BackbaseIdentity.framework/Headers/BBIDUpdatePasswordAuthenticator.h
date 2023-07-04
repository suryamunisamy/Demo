//
//  BBIDUpdatePasswordAuthenticator.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 11/03/2020.
//  Copyright © 2020 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>
#import "BBIDUpdatePasswordAuthenticatorContract.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDUPDATEPASSWORDAUTHENTICATOR_CLASS
#define BBIDUPDATEPASSWORDAUTHENTICATOR_CLASS

/// Authenticator to handle the `update-password` challenge
@interface BBIDUpdatePasswordAuthenticator : BBIDAuthenticator <BBIDUpdatePasswordAuthenticatorContract>
@end

#endif

NS_ASSUME_NONNULL_END
