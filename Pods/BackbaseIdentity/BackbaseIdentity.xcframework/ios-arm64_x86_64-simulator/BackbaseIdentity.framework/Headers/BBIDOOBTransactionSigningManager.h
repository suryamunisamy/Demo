//
//  BBIDOOBTransactionSigningManager.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 30/06/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BBIDOOBTransactionSigningDelegate.h"

#ifndef BBIDOOBTRANSACTIONSIGNINGMANAGER_CLASS
#define BBIDOOBTRANSACTIONSIGNINGMANAGER_CLASS

NS_ASSUME_NONNULL_BEGIN

/// Convenience class for all operations related to out-of-band transaction signing
@interface BBIDOutOfBandTransactionSigningManager : NSObject

/// Convenience method to start the process to approve an out-of-band transaction. The result of the operation will be
/// delivered in the delegate's methods.
/// @param confirmationId the id of the confirmation to be be approved.
/// @param acrValues acrValues for the authentication process
/// @param delegate delegate instance to return the result of the operation.
+ (void)approveTransactionWithConfirmationId:(NSString*)confirmationId
                                   acrValues:(NSString*)acrValues
                                    delegate:(NSObject<BBIDOutOfBandTransactionSigningDelegate>*)delegate
    NS_SWIFT_NAME(approveTransaction(confirmationId:acrValues:delegate:));

/// Convenience method to start the process to decline an out-of-band transaction. The result of the operation will be
/// delivered in the delegate's methods.
/// @param confirmationId the id of the confirmation to be be declined.
/// @param acrValues acrValues for the authentication process
/// @param delegate delegate instance to return the result of the operation.
+ (void)declineTransactionWithConfirmationId:(NSString*)confirmationId
                                   acrValues:(NSString*)acrValues
                                    delegate:(NSObject<BBIDOutOfBandTransactionSigningDelegate>*)delegate
    NS_SWIFT_NAME(declineTransaction(confirmationId:acrValues:delegate:));

@end

NS_ASSUME_NONNULL_END

#endif
