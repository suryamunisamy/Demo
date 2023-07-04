//
//  BBIDPasscodeAuthenticatorDelegate.h
//  BackbaseIdentity
//
//  Created by Sumanth Koduganti on 18/03/2022.
//  Copyright © 2022 Backbase. All rights reserved.
//

#import "BBIDAuthenticatorDelegate.h"

#ifndef BBIDPasscodeAuthenticatorDelegate_h
#define BBIDPasscodeAuthenticatorDelegate_h

@protocol BBIDPasscodeAuthenticatorDelegate <BBIDAuthenticatorDelegate>

- (void)passcodeDidFailWithError:(NSError*)error NS_SWIFT_NAME(passcodeDidFail(with:));

- (void)passcodeDidSucceedWithResponse:(NSHTTPURLResponse*)response data:(NSData*)data NS_SWIFT_NAME(passcodeDidSucceed(with:data:));

@end

#endif /* BBIDPasscodeAuthenticatorDelegate_h */
