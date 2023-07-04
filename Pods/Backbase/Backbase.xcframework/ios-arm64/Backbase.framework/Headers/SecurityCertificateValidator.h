//
//  SecurityCertificateValidator.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 12/09/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

/**
 * Allows to extend/override the SSL certificate pinning validation with custom code. It might be useful to implement
 * other certificate pinning, for example, using the hashes instead of binary check.
 */
@protocol SecurityCertificateValidator <NSObject>
@required

/**
 * Validates the current challenge against the list of configured certificates.
 * @discussion The output of this method will be used to determine if the certificate received from the server is
 * considered as untrusted, if so, the Security Violation will be send automatically, without further action required in
 * this method implementation.
 *
 * @param challenge    Authentication challenge to run against the trusted certificates
 * @param certificates List of trusted certificates that the challenge has to be validated, as their NSData
 * representation
 *
 * @return YES if the challenge is successful, NO otherwise.
 */
- (BOOL)validateCertificate:(NSURLAuthenticationChallenge *_Nonnull)challenge
               certificates:(NSArray<NSData *> *_Nonnull)certificates;
@end
