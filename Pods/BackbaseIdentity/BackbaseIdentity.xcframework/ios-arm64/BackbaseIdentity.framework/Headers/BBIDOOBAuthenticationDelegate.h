//
//  BBIDOOBAuthenticationDelegate.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 31/07/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

#ifndef BBIDOOBAUTHENTICATIONDELEGATE_PROTOCOL
#define BBIDOOBAUTHENTICATIONDELEGATE_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Protocol to inform about the result of the operation
@protocol BBIDOutOfBandAuthDelegate <NSObject>

/// Notifies the conforming object that the operation was successful.
/// @param confirmationId the confirmation id that the operation was started with
- (void)authenticationDidSucceedWithConfirmationId:(NSString*)confirmationId
    NS_SWIFT_NAME(authenticationDidSucceed(confirmationId:));

/// Notifies the conforming object that the operation ended with the user declining.
/// @param confirmationId the confirmation id that the operation was started with
- (void)authenticationDeclinedWithConfirmationId:(NSString*)confirmationId
    NS_SWIFT_NAME(authenticationDeclined(confirmationId:));

/// Notifies the conforming object that the operation failed with a specific error.
/// @param confirmationId the confirmation id that the operation was started with
/// @param error Error that caused the failure.
- (void)authenticationDidFailWithConfirmationId:(NSString*)confirmationId
                                          error:(NSError*)error
    NS_SWIFT_NAME(authenticationDidFail(confirmationId:error:));

@end

NS_ASSUME_NONNULL_END

#endif
