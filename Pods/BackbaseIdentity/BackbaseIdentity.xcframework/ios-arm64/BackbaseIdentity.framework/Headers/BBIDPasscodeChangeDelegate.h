//
//  BBIDPasscodeChangeDelegate.h
//  Backbase
//
//  Created by Backbase B.V. on 29/10/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDPASSCODECHANGEDELEGATE_PROTOCOL
#define BBIDPASSCODECHANGEDELEGATE_PROTOCOL

/// Protocol to inform about the status of the change passcode operation
@protocol BBIDPasscodeChangeDelegate <NSObject>

/// Conforming object will be notified that the change of passcode completed successfully
- (void)passcodeChangeDidSucceed;

/// Conforming object will be notified that the change of passcode failed with the given error
/// @param error Cause of the failure
- (void)passcodeChangeDidFailWithError:(NSError*)error NS_SWIFT_NAME(passcodeChangeDidFail(with:));
@end

#endif

NS_ASSUME_NONNULL_END
