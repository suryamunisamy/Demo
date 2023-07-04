//
//  BBIDSingleSignOnHelper.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 19/01/2021.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>
#import <WebKit/WebKit.h>
#import "BBIDSingleSignOnHelperDelegate.h"

#ifndef BBIDSingleSignOnHelper_h
#define BBIDSingleSignOnHelper_h

NS_ASSUME_NONNULL_BEGIN

/**
 * Single sign-on helper used to enable SSO in a WKWebView.
 */
@interface BBIDSingleSignOnHelper: NSObject

/**
 * Initializes SSO helper class
 * @param webview view class reference to be used by this helper to save relevant cookies.
 * @param delegate Single Sign-on success or failure is communicated via this object.
 * @param refreshAutomatically a boolean flag to indicate if the OAuth2 access token should be refreshed automatically if it is found to be expired.
 * @return A new instance of BBIDSingleSignOnHelper.
 */
- (instancetype)initWithWebView:(WKWebView*)webview
                                  delegate:(NSObject<BBIDSingleSignOnHelperDelegate>*)delegate
    refreshExpiredOAuth2TokenAutomatically:(BOOL)refreshAutomatically;
/**
 * Used to check if a URL is valid for handling Single Sign-on request.
 * @param url to be used for Single Sign-on request.
 * @return true if the url is formatted for an OIDC request or false if not.
 */
- (BOOL)shouldHandleSSORequest:(NSURL*)url;
/**
 * Performs operations to handle Single sign-on request.
 * @param url to be used for Single Sign-on request.
 * @return true if the request will be handled, false if it fails.
 */
- (BOOL)handleSSO:(NSURL*)url;

@end

NS_ASSUME_NONNULL_END

#endif /* BBIDSingleSignOnHelper_h */
