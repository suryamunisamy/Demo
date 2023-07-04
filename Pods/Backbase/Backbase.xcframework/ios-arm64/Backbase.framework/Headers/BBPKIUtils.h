// 
//  BBPKIUtils.h
//  Backbase
//
//  Created by Backbase B.V. on 10/01/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

extern NSString* _Nonnull const kAlgKeyECCX962Raw;
extern NSString* _Nonnull const kAlgSignSECP256R1ECDSASHA256Der;

/// Utility class to execute Public Key Infrastructure operations, such as: generate key pairs, retrieve them, sign
/// payloads and verify signatures.
@interface BBPKIUtils : NSObject
/**
 * Generates a key-pair for the given alias on the Secure Enclave.
 * @param alias Alias name for the new key-pair
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if the key-pair was created successfully, NO if any error occurred.
 */
+ (BOOL)generateKeyPair:(NSString* _Nonnull)alias error:(NSError* _Nullable* _Nullable)error;

/**
 * Generates a key-pair for the given alias on the Secure Enclave.
 * @param alias Alias name for the new key-pair
 * @param requiresUserAuthentication Flag indicating that the generated key-pair needs to be unlocked by the user prior
 * usage.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if the key-pair was created successfully, NO if any error occurred.
 */
+ (BOOL)generateKeyPair:(NSString* _Nonnull)alias
    requireUserAuthentication:(BOOL)requiresUserAuthentication
                        error:(NSError* _Nullable* _Nullable)error;

/**
 * Checks for the existance of a key-pair under the given alias on the Secure Enclave.
 * @param alias Alias name to check its existance
 * @return YES if there is key-pair under the given alias, NO otherwise.
 */
+ (BOOL)hasKeyPair:(NSString* _Nonnull)alias;

/**
 * Retrieves the public key for the given alias in it's exportable format and encoded as a base64 value.
 * @param alias Alias name of the private key which public key will be exported
 * @return Base 64 encoded string with the key exportable representation
 */
+ (NSString* _Nullable)publicKeyForAlias:(NSString* _Nonnull)alias;

/**
 * Deletes a key-pair for a given alias on the Secure Enclave.
 * @param alias Alias name to delete
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if the key pair was deleted, NO otherwise.
 */
+ (BOOL)deleteKeyPairForAlias:(NSString* _Nonnull)alias error:(NSError* _Nullable* _Nullable)error;

/**
 * Signs data using the key-pair for the given alias.
 * @param toSign The data to be signed.
 * @param alias Alias of the key to be used for signing.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return Base64 encoded signature, or nil of an error occurs.
 */
+ (NSString * _Nullable)signData:(NSData* _Nonnull) toSign
                           alias:(NSString* _Nonnull) alias
                           error:(NSError* _Nullable* _Nullable) error NS_SWIFT_NAME(sign(toSign:alias:));

/**
 * Signs data using the key-pair for the given alias.
 * @param toSign The data to be signed.
 * @param alias Alias of the key to be used for signing.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return Binary signature, or nil of an error occurs.
 */
+ (NSData* _Nullable)rawSignData:(NSData* _Nonnull)toSign
                           alias:(NSString* _Nonnull)alias
                           error:(NSError* _Nullable* _Nullable)error NS_SWIFT_NAME(rawSign(toSign:alias:));

/**
 * Verifies signed data using the key-pair for the given alias.
 * @param signature The signature of the data as a Base64 encoded string,
 *        an error is raised if this is not a Base64 encoded string.
 * @param alias Alias of the key to be used for verifying.
 * @param original The data that was signed.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if the signature was verified, NO otherwise.
 */
+ (BOOL) verifySignature:(NSString* _Nonnull) signature
                   alias:(NSString* _Nonnull) alias
                original:(NSData* _Nonnull) original
                   error:(NSError* _Nullable* _Nullable) error NS_SWIFT_NAME(verify(signature:alias:original:));

@end
