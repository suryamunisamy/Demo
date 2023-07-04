// 
//  BBIDReAuthAuthenticatorDelegate.h
//  Backbase
//
//  Created by Backbase B.V. on 06/05/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorDelegate.h"

NS_ASSUME_NONNULL_BEGIN

/// Conforming object will be notified about changes on the state of the reauthentication process
@protocol BBIDReAuthAuthenticatorDelegate <BBIDAuthenticatorDelegate>

/**
 * Signals that reauthentication was successful.
 */
- (void)reAuthSuccessful;

/**
 * Signals that reauthentication failed.
 * @param error the error that occurred
 */
- (void)reAuthDidFailWithError:(NSError*)error NS_SWIFT_NAME(reAuthDidFail(with:));

@end

NS_ASSUME_NONNULL_END
