//
//  BBIDOOBTransactionSigningDelegate.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 30/06/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

#ifndef BBIDOOBTRANSACTIONSIGNINGDELEGATE_PROTOCOL
#define BBIDOOBTRANSACTIONSIGNINGDELEGATE_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Protocol to inform about the result of the approve/decline operation
@protocol BBIDOutOfBandTransactionSigningDelegate <NSObject>

/// Notifies the conforming object that the approve operation was successful.
/// @param confirmationId the confirmation id that the operation was started with
- (void)approveTransactionDidSucceedWithConfirmationId:(NSString*)confirmationId
    NS_SWIFT_NAME(approveTransactionDidSucceed(confirmationId:));

/// Notifies the conforming object that the approve operation failed with a specific error.
/// @param confirmationId the confirmation id that the operation was started with
/// @param error Error that caused the failure.
- (void)approveTransactionDidFailWithConfirmationId:(NSString*)confirmationId
                                              error:(NSError*)error
    NS_SWIFT_NAME(approveTransactionDidFail(confirmationId:error:));

/// Notifies the conforming object that the decline operation was successful.
/// @param confirmationId the confirmation id that the operation was started with
- (void)declineTransactionDidSucceedWithConfirmationId:(NSString*)confirmationId
    NS_SWIFT_NAME(declineTransactionDidSucceed(confirmationId:));

/// Notifies the conforming object that the decline operation failed with a specific error.
/// @param confirmationId the confirmation id that the operation was started with
/// @param error Error that caused the failure.
- (void)declineTransactionDidFailWithConfirmationId:(NSString*)confirmationId
                                              error:(NSError*)error
    NS_SWIFT_NAME(declineTransactionDidFail(confirmationId:error:));

@end

NS_ASSUME_NONNULL_END

#endif
