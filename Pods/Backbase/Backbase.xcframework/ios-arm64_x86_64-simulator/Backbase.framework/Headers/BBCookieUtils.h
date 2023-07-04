//
//  BBCookieUtils.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 14/11/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

#ifndef BBCOOKIEUTILS_CLASS
#define BBCOOKIEUTILS_CLASS

/// Utility class to provide easy access to the cookie storage
@interface BBCookieUtils : NSObject

/// Clears all cookies of the cookie storage
+ (void)clearCookieStorage;

/**
 * Adds a cookie to the storage.
 * @param cookie A non-null cookie to add
 */
+ (void)addCookie:(NSHTTPCookie* _Nonnull)cookie;

/**
 * Adds a list of cookies to the storage.
 * @param cookies A non-null array of cookies to add
 */
+ (void)addCookies:(NSArray<NSHTTPCookie*>* _Nonnull)cookies;

/**
 * Removes the cookie with the given name from the storage.
 * @param name Name of the cookie to be removed
 */
+ (void)removeCookieWithName:(NSString* _Nonnull)name;

/**
 * Retrieves the stored cookie with the given name.
 * @discussion In order to keep the cookie storage as clean as possible, if the cookie to be retrieved is already
 * expired, it will be removed automatically, and nil will be returned instead.
 * @param name Name of the cookie to be retrieved
 * @return The cookie with the given name if it is not expired, nil if the cookie doesn't exist or if it is expired.
 */
+ (NSHTTPCookie* _Nullable)cookieByName:(NSString* _Nonnull)name;

/**
 * Retrieve the stored cookie for the given name and the given domain.
 * @discussion If the domain's URL is nil it will only match cookies by name.
 * @param name Name of the cookie to be retrieved
 * @param URL URL to be used to match the domain of the cookie
 * @return The cookie with the given name and domain if it is not expired, nil if the cookie doesn't exist or if it
 * is expired.
 */
+ (NSHTTPCookie* _Nullable)cookieByName:(NSString* _Nonnull)name domain:(NSURL* _Nullable)URL;

/**
 * Retrieves the cookie stored with name JSESSOINID.
 * @discussion This is a convenience method. It will invoke BBCookieUtils.cookieByName with a predefined value for the
 * JSESSIONID compatible with Backbase specifications.
 * @return The JSESSIONID cookie if present or nil if expired or absent
 */
+ (NSString* _Nullable)JSESSIONID;

/**
 * Retrieves the CSRF token from the cookie storage or requests a new one to the server if it is not present on the
 * storage.
 * @discussion When there is no CSRF token stored in the cookie storage, this method will try to retrieve a new token
 * by making an asynchronous network request to the status server. Still there is a possibility that it's not possible
 * to retrieve a CSRF token, e.g. the request to the server times out. In such cases, the returned token will be nil.
 * @param completionHandler A handler to receive the CSRF token
 */
+ (void)CSRFTokenWithHandler:(void (^_Nullable)(NSString* _Nullable))completionHandler;
@end
#endif
