// 
//  BBIDPasscodeAuthenticator.h
//  Backbase
//
//  Created by Backbase B.V. on 08/10/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>
#import "BBIDPasscodeAuthenticatorContract.h"

#ifndef BBIDPASSCODEAUTHENTICATOR_CLASS
#define BBIDPASSCODEAUTHENTICATOR_CLASS

NS_ASSUME_NONNULL_BEGIN

/// Core implementation of an FIDO passcode authenticator
@interface BBIDPasscodeAuthenticator : BBIDFIDOAuthenticator <BBIDPasscodeAuthenticatorContract>
@end

NS_ASSUME_NONNULL_END

#endif
