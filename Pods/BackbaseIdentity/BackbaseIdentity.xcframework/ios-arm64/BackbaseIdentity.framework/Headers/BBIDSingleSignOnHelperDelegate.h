//
//  BBIDSingleSignOnHelperDelegate.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 21/01/2021.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

#ifndef BBIDSINGLESIGNONHELPERDELEGATE_PROTOCOL
#define BBIDSINGLESIGNONHELPERDELEGATE_PROTOCOL
NS_ASSUME_NONNULL_BEGIN

/// BBIDSingleSignOnHelperDelegate protocol. The conforming object will be notified of events token-related,
/// refreshing or failures.
@protocol BBIDSingleSignOnHelperDelegate
/**
 * Notifies the conforming object that the Single Sign-on failed with the error object containing more accurate
 * information.
 * @param error Error object containing information about the failure cause.
 */
- (void)ssoDidFailWithError:(NSError*)error;
/**
 * Notifies the conforming object that the Single Sign-on was successful.
 * @param request NSURLRequest object created with the URL to be used for reloading webview.
 */
- (void)ssoDidSucceedWithRequest:(NSURLRequest*)request;

@end
NS_ASSUME_NONNULL_END

#endif
