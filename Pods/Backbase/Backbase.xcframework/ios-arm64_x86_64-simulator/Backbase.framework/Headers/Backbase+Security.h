//
//  Backbase+Security.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 03/08/15.
//  Copyright (c) 2015 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef BACKBASESECURITY_CLASS
#define BACKBASESECURITY_CLASS

@interface Backbase (Security)
/**
 * Indicates whether the device is jailbroken or not
 * @return BOOL YES, there's a good *indication* of jailbreak. NO good *indication* of no jailbreak (could still be jailbroken).
 *
 */
+ (BOOL)isDeviceJailbroken;

/**
* Indicates whether the application is being reverse engineered
* @return BOOL YES, there's a good *indication* that is being reverse engineered. NO good *indication*  that is not being reverse engineered.
*/
+ (BOOL)isBeingReverseEngineered;

/**
* Denies application usage when device is Jailbroken
*/
+ (void)denyWhenJailbroken;

/**
* Denies application usage when application is being reverse engineered
*/
+ (void)denyWhenReverseEngineered;

/**
 * Registers an instance that conforms to the SecurityViolationDelegate protocol.
 * @param delegate An instance conforming the protocol.
 */
+ (void)securityViolationDelegate:(NSObject<SecurityViolationDelegate>* _Nullable)delegate;

/**
 * Registers an instance that conforms to the SecurityCertificateValidator protocol, to be used during the Certificate
 * pinning process.
 * @discussion If the certificate validator is not provided the SDK will use the default implementation. The SDK will
 * not retain a strong reference to the certificateValidator provided; it is up to the implementation to hold a strong
 * reference to the passed object.
 * @param certificateValidator An instance conforming the protocol.
 */
+ (void)securityCertificateValidator:(NSObject<SecurityCertificateValidator>* _Nullable)certificateValidator;

/**
 * Retrieves a preconfigured NSURLSessionConfiguration that can be used with 3rd party networking libraries to take
 * advantage of the built-in security features:
 * <ul>
 *   <li>Whitelisted domains (RWARP)</li>
 *   <li>SSL pinning</li>
 *   <li>Runtime integrity check for file:// requests</li>
 *   <li>Development features as allowUntrustedCertificates</li>
 * </ul>
 *
 * @return A preconfigured NSURLSessionConfiguration
 */
+ (NSURLSessionConfiguration* _Nonnull)securitySessionConfiguration;

/**
 * Verifies the signatures of a batch of files against an encrypted secured control.
 * @param securedControl Path of the control file relative to the basePath
 * @param paths List of paths to verify the sigantures. Each paths should be relative to the basePath
 * @param basePath Base path used to search and verify files from. The basePath is also relative to the
 * NSLibraryDirectory.
 * @param key Key used to encrypt the file.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if all paths were successfully verified and all of the matched the expected hashes. No if there is any
 * errors.
 */
+ (BOOL)verifySignaturesWith:(NSString* _Nonnull)securedControl
                       paths:(NSArray<NSString*>* _Nonnull)paths
                    basePath:(NSString* _Nonnull)basePath
                         key:(NSString* _Nonnull)key
                       error:(NSError* _Nullable* _Nullable)error;

/**
 * Re-initializes the NSURLSession, used for intercepting calls and updating security headers, with the session configuration.
 *
 * You should call this method when you update the `securitySessionConfiguration`, for example with new headers, in order
 * for these updates to be reflected in later requests.
 */
+ (void)updateSessionConfiguration;

@end

#endif
