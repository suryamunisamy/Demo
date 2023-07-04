// 
//  BBIDReAuthAuthenticator.h
//  Backbase
//
//  Created by Backbase B.V. on 06/05/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticator.h"
#import "BBIDReAuthAuthenticatorContract.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDREAUTHAUTHENTICATOR_CLASS
#define BBIDREAUTHAUTHENTICATOR_CLASS

/// Authenticator to handle the `reauth` challenge
@interface BBIDReAuthAuthenticator : BBIDAuthenticator <BBIDReAuthAuthenticatorContract>

@end

#endif

NS_ASSUME_NONNULL_END
