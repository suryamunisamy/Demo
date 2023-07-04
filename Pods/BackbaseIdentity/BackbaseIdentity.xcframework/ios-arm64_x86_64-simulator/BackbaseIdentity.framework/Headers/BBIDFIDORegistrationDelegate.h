// 
//  BBIDFIDORegistrationDelegate.h
//  Backbase
//
//  Created by Backbase B.V. on 05/11/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDFIDOREGISTRATIONDELEGATE_PROTOCOL
#define BBIDFIDOREGISTRATIONDELEGATE_PROTOCOL

/// Protocol to inform about the status of the FIDO registration operation
@protocol BBIDFIDORegistrationDelegate <NSObject>

/// Conforming object will be notified that the operation completed successfully
- (void)UAFRegistrationDidSucceed;

/// Conforming object will be informed that the operation failed with the given reason
/// @param error Cause of the failure
- (void)UAFRegistrationDidFailWithError:(NSError*)error NS_SWIFT_NAME(uafRegistrationDidFail(with:));

@end

#endif

NS_ASSUME_NONNULL_END
