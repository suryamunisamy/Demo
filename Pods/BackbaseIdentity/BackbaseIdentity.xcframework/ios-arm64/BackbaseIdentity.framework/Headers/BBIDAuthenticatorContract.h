// 
//  BBIDAuthenticatorContract.h
//  Backbase
//
//  Created by Backbase B.V. on 20/02/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorDataSource.h"
#import "BBIDAuthenticatorDelegate.h"

#ifndef BBIDAUTHENTICATORCONTRACT_PROTOCOL
#define BBIDAUTHENTICATORCONTRACT_PROTOCOL

/// Protocol to define the general behavior available to any kind of authenticator.
@protocol BBIDAuthenticatorContract <NSObject>

/// Finalizes the authenticator execution and dismiss its view.
- (void)finish;

@end

#endif
