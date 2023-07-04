// 
//  BBIDPasscodeManager.h
//  Backbase
//
//  Created by Backbase B.V. on 29/10/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import "BBIDAuthClient.h"
#import "BBIDPasscodeChangeDelegate.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDPASSCODEMANAGER_CLASS
#define BBIDPASSCODEMANAGER_CLASS

/// Entry point for all passcode related operations that are not registration and authentication.
@interface BBIDPasscodeManager : NSObject
/// Convenience method to start the process of changing a Identity passcode for the given username.
/// @param username User to change the passcode
/// @param authClient A BBIDAuthClient instance to be used to trigger the process
/// @param delegate Delegate to notify when the operation completes.
+ (void)changePasscode:(NSString*)username
            authClient:(BBIDAuthClient*)authClient
              delegate:(NSObject<BBIDPasscodeChangeDelegate>*)delegate;
@end

#endif

NS_ASSUME_NONNULL_END
